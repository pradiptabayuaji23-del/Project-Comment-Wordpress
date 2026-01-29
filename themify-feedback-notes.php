<?php
/*
Plugin Name: Themify Figma-Style Feedback (Shortcode)
Description: Menambahkan fitur komentar visual. Gunakan shortcode [figma_feedback] di modul Text Themify.
Version: 2.3
Author: Radit
*/

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 1. DAFTARKAN SHORTCODE
 */
function tfn_render_button_shortcode() {
    if ( ! is_user_logged_in() ) return '';
    return '<button id="tfn-toggle-mode" class="tfn-trigger-btn">Aktifkan Mode Komentar</button>';
}
add_shortcode( 'figma_feedback', 'tfn_render_button_shortcode' );


/**
 * 2. ASSETS (JS & CSS)
 */
function tfn_enqueue_assets() {
    if ( is_admin() || isset($_GET['tb-preview']) ) return;

    if ( is_user_logged_in() ) {
        
        $css = "
            /* Sembunyikan tombol saat builder aktif */
            body.themify_builder_active #tfn-toggle-mode { display: none !important; }

            /* Style Tombol - Melayang (Fixed) */
            #tfn-toggle-mode { 
                position: fixed; bottom: 30px; right: 30px; z-index: 9999999;
                background: #222; color: #fff; padding: 12px 24px; border-radius: 50px; 
                cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
                font-family: sans-serif; font-weight: 600; border: none; font-size: 14px;
                transition: all 0.3s ease;
            }
            #tfn-toggle-mode:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }

            /* Overlay Gelap */
            #tfn-canvas-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 999990; cursor: crosshair; background: rgba(0,0,0,0.1); display: none;
            }
            
            /* Pin Merah */
            .tfn-pin {
                position: absolute; width: 32px; height: 32px; background: #E91E63;
                border-radius: 50% 50% 50% 0; border: 2px solid #fff; 
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                transform: translate(-50%, -100%) rotate(-45deg); 
                cursor: pointer; z-index: 999995; 
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s;
            }
            .tfn-pin:hover { transform: translate(-50%, -110%) rotate(-45deg) scale(1.1); z-index: 999999; }
            .tfn-pin span { transform: rotate(45deg); color: #fff; font-weight: bold; font-family: sans-serif; }
            
            /* Kotak Input */
            .tfn-comment-box {
                position: absolute; background: #fff; padding: 15px; border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 260px; z-index: 999999;
                font-family: sans-serif; border: 1px solid #ddd;
            }
            .tfn-comment-box textarea { width: 100%; height: 70px; margin-bottom: 10px; padding: 8px; border:1px solid #eee; width: 90%; }
            .tfn-btn-group { display: flex; gap: 5px; justify-content: flex-end; }
            .tfn-save-btn { background: #E91E63; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
            .tfn-cancel-btn { background: #eee; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        ";
        wp_add_inline_style( 'themify-builder-style', $css );
        if (!wp_style_is('themify-builder-style')) {
             wp_register_style( 'tfn-style', false );
             wp_enqueue_style( 'tfn-style' );
             wp_add_inline_style( 'tfn-style', $css );
        }

        wp_enqueue_script( 'jquery' );
        
        $js = "
        jQuery(document).ready(function($) {
            
            if($('body').hasClass('themify_builder_active')) return;

            // Inject Overlay
            if($('#tfn-canvas-overlay').length === 0) {
                $('body').append('<div id=\"tfn-canvas-overlay\"></div>');
            }

            // Load Pins LANGSUNG
            loadPins();

            let isModeActive = false;
            
            // Toggle Button Logic
            $(document).on('click', '#tfn-toggle-mode', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                isModeActive = !isModeActive;
                
                if(isModeActive) {
                    $('#tfn-canvas-overlay').fadeIn(200);
                    $(this).text('Keluar Mode Komentar').css('background', '#E91E63');
                } else {
                    $('#tfn-canvas-overlay').fadeOut(200);
                    $(this).text('Aktifkan Mode Komentar').css('background', '#222');
                    $('.tfn-comment-box').remove();
                }
            });

            // Klik Overlay (Add Note)
            $(document).on('click', '#tfn-canvas-overlay', function(e) {
                if ($(e.target).closest('.tfn-pin, .tfn-comment-box, #tfn-toggle-mode').length) return;
                
                $('.tfn-comment-box').remove(); 

                let x = e.pageX;
                let y = e.pageY;
                
                let inputHtml = `
                    <div class='tfn-comment-box' style='top:\${y}px; left:\${x}px'>
                        <textarea placeholder='Tulis revisi di sini...'></textarea>
                        <div class='tfn-btn-group'>
                            <button class='tfn-cancel-btn'>Batal</button>
                            <button class='tfn-save-btn'>Simpan</button>
                        </div>
                    </div>
                `;
                $('body').append(inputHtml);
                $('.tfn-save-btn').data('x', x).data('y', y);
            });

            // Save Note
            $(document).on('click', '.tfn-save-btn', function() {
                let box = $(this).closest('.tfn-comment-box');
                let msg = box.find('textarea').val();
                let x = $(this).data('x');
                let y = $(this).data('y');

                if(msg && typeof tfn_ajax !== 'undefined') {
                    let btn = $(this);
                    btn.text('...');
                    $.post(tfn_ajax.url, {
                        action: 'tfn_save_note',
                        note: msg,
                        pos_x: x,
                        pos_y: y,
                        url: window.location.href
                    }, function(response) {
                        if(response.success) {
                            addPinToScreen(response.data.id, x, y, msg);
                            box.remove();
                        }
                    });
                }
            });

            $(document).on('click', '.tfn-cancel-btn', function() {
                $(this).closest('.tfn-comment-box').remove();
            });

            function loadPins() {
                if(typeof tfn_ajax === 'undefined') return;
                $.get(tfn_ajax.url, {
                    action: 'tfn_get_notes',
                    url: window.location.href
                }, function(response) {
                    if(response.success) {
                        $('.tfn-pin').remove(); // Refresh agar tidak duplikat
                        response.data.forEach(function(pin) {
                            addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.content);
                        });
                    }
                });
            }

            function addPinToScreen(id, x, y, msg) {
                let pin = `<div class='tfn-pin' title='\${msg}' style='top:\${y}px; left:\${x}px'><span>!</span></div>`;
                $('body').append(pin);
                
                // Event Click Pin
                $('.tfn-pin').last().on('click', function(e) { 
                    e.stopPropagation();
                    alert(msg); 
                });
            }
        });
        ";
        wp_add_inline_script( 'jquery', $js );
        wp_localize_script( 'jquery', 'tfn_ajax', array( 'url' => admin_url( 'admin-ajax.php' ) ) );
    }
}
add_action( 'wp_enqueue_scripts', 'tfn_enqueue_assets' );


/**
 * 3. BACKEND: Custom Post Type (MODIFIKASI DI SINI)
 * Agar masuk ke Module Themify, 'public' harus true.
 */
function tfn_register_cpt() {
    $labels = array(
        'name'               => 'Catatan Revisi',
        'singular_name'      => 'Catatan',
        'menu_name'          => 'Catatan Revisi',
        'name_admin_bar'     => 'Catatan Revisi',
        'add_new'            => 'Tambah Baru',
        'add_new_item'       => 'Tambah Catatan Baru',
        'new_item'           => 'Catatan Baru',
        'edit_item'          => 'Edit Catatan',
        'view_item'          => 'Lihat Catatan',
        'all_items'          => 'Semua Catatan',
        'search_items'       => 'Cari Catatan',
        'not_found'          => 'Tidak ada catatan ditemukan.',
    );

    $args = array(
        'labels'             => $labels,
        'public'             => true, // <--- UBAH JADI TRUE (Supaya terbaca oleh Themify Builder)
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'exclude_from_search'=> true, // Tetap sembunyikan dari pencarian website biasa
        'rewrite'            => array( 'slug' => 'catatan-revisi' ),
        'capability_type'    => 'post',
        'has_archive'        => false,
        'hierarchical'       => false,
        'menu_position'      => 50,
        'menu_icon'          => 'dashicons-format-chat',
        'supports'           => array( 'title', 'editor', 'custom-fields' ),
    );

    register_post_type( 'tfn_note', $args );
}
add_action( 'init', 'tfn_register_cpt' );

// ... AJAX Handlers ...
add_action( 'wp_ajax_tfn_save_note', 'tfn_save_note_handler' );
function tfn_save_note_handler() {
    $note = sanitize_textarea_field( $_POST['note'] );
    $x = sanitize_text_field( $_POST['pos_x'] );
    $y = sanitize_text_field( $_POST['pos_y'] );
    $url = sanitize_text_field( $_POST['url'] );

    $post_id = wp_insert_post(array(
        'post_type' => 'tfn_note',
        'post_content' => $note,
        'post_title' => 'Revisi: ' . substr($note, 0, 20) . '...',
        'post_status' => 'publish'
    ));

    if( $post_id ) {
        update_post_meta( $post_id, 'tfn_x', $x );
        update_post_meta( $post_id, 'tfn_y', $y );
        update_post_meta( $post_id, 'tfn_url', $url );
        wp_send_json_success( array('id' => $post_id) );
    } else {
        wp_send_json_error();
    }
}

add_action( 'wp_ajax_tfn_get_notes', 'tfn_get_notes_handler' );
function tfn_get_notes_handler() {
    $url = sanitize_text_field( $_GET['url'] );
    $args = array(
        'post_type' => 'tfn_note',
        'posts_per_page' => -1,
        'meta_query' => array( array( 'key' => 'tfn_url', 'value' => $url, 'compare' => '=' ) )
    );
    $query = new WP_Query( $args );
    $notes = array();
    if( $query->have_posts() ) {
        while( $query->have_posts() ) {
            $query->the_post();
            $notes[] = array(
                'id' => get_the_ID(),
                'content' => get_the_content(),
                'meta' => array(
                    'x' => get_post_meta( get_the_ID(), 'tfn_x', true ),
                    'y' => get_post_meta( get_the_ID(), 'tfn_y', true )
                )
            );
        }
    }
    wp_send_json_success( $notes );
}
?>