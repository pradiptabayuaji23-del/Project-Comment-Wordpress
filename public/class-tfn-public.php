<?php

class TFN_Public {

    public function init() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_shortcode( 'figma_feedback', array( $this, 'render_button_shortcode' ) );
        
        // AJAX Handlers
        add_action( 'wp_ajax_tfn_save_note', array( $this, 'save_note_handler' ) );
        add_action( 'wp_ajax_tfn_get_notes', array( $this, 'get_notes_handler' ) );
    }

    /**
     * 1. DAFTARKAN SHORTCODE
     */
    public function render_button_shortcode() {
        if ( ! is_user_logged_in() ) return '';
        return '<button id="tfn-toggle-mode" class="tfn-trigger-btn">Aktifkan Mode Komentar</button>';
    }

    /**
     * 2. ASSETS (JS & CSS)
     */
    public function enqueue_assets() {
        if ( is_admin() || isset($_GET['tb-preview']) ) return;

        if ( is_user_logged_in() ) {
            wp_enqueue_style( 'tfn-style', plugin_dir_url( dirname(__FILE__) ) . 'assets/css/style.css', array(), '2.3' );
            
            wp_enqueue_script( 'tfn-script', plugin_dir_url( dirname(__FILE__) ) . 'assets/js/script.js', array('jquery'), '2.3', true );
            
            wp_localize_script( 'tfn-script', 'tfn_ajax', array( 
                'url' => admin_url( 'admin-ajax.php' ),
                'nonce' => wp_create_nonce( 'tfn-nonce' ) // Added nonce for security
            ));
        }
    }

    /**
     * AJAX: Save Note
     */
    public function save_note_handler() {
        // Verify Nonce
        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'tfn-nonce' ) ) {
            wp_send_json_error( 'Invalid nonce' );
        }

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

    /**
     * AJAX: Get Notes
     */
    public function get_notes_handler() {
         // Verify Nonce (Optional for read-only, but good practice if sensitive content, 
         // though here it's just public visible notes usually, but we check if user is logged in via is_user_logged_in() earlier in enqueue.
         // Let's add nonce check to be safe as the enqueue is behind login check.
         if ( ! isset( $_GET['nonce'] ) || ! wp_verify_nonce( $_GET['nonce'], 'tfn-nonce' ) ) {
            wp_send_json_error( 'Invalid nonce' );
        }

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
}
