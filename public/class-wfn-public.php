<?php

class WFN_Public {

    public function init() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'wp_footer', array( $this, 'render_button_auto' ) ); // Auto-inject
        
        // AJAX Handlers
        add_action( 'wp_ajax_wfn_save_note', array( $this, 'save_note_handler' ) );
        add_action( 'wp_ajax_nopriv_wfn_save_note', array( $this, 'save_note_handler' ) ); // Guest support

        add_action( 'wp_ajax_wfn_get_notes', array( $this, 'get_notes_handler' ) );
        add_action( 'wp_ajax_nopriv_wfn_get_notes', array( $this, 'get_notes_handler' ) ); // Guest support

        // Token Verification
        add_action( 'wp_ajax_wfn_verify_token', array( $this, 'verify_token_handler' ) );
        add_action( 'wp_ajax_nopriv_wfn_verify_token', array( $this, 'verify_token_handler' ) );

        // Reply Handler
        add_action( 'wp_ajax_wfn_save_reply', array( $this, 'save_reply_handler' ) );
        add_action( 'wp_ajax_nopriv_wfn_save_reply', array( $this, 'save_reply_handler' ) );
    }

    /**
     * 1b. AUTO INJECT BUTTON (wp_footer)
     */
    public function render_button_auto() {
        // Check if we are not in admin, not in builder preview (if needed), etc.
        // Assuming enqueue_assets checks cover most, but wp_footer runs everywhere.
        if ( is_admin() || isset($_GET['tb-preview']) ) return; 
        
        echo '<button id="wfn-toggle-mode" class="wfn-trigger-btn">Aktifkan Mode Komentar</button>';
    }

    /**
     * 2. ASSETS (JS & CSS)
     */
    public function enqueue_assets() {
        if ( is_admin() || isset($_GET['tb-preview']) ) return;

        wp_enqueue_style( 'wfn-style', plugin_dir_url( dirname(__FILE__) ) . 'assets/css/style.css', array(), '2.4' );
        
        wp_enqueue_script( 'wfn-script', plugin_dir_url( dirname(__FILE__) ) . 'assets/js/script.js', array('jquery'), '2.4', true );
        
        $require_token = ( get_option('wfn_feedback_token') && ! is_user_logged_in() ) ? true : false;
        
        wp_localize_script( 'wfn-script', 'wfn_ajax', array( 
            'url' => admin_url( 'admin-ajax.php' ),
            'nonce' => wp_create_nonce( 'wfn-nonce' ), // Added nonce for security
            'require_token' => $require_token,
            'is_admin' => is_user_logged_in() // Check if user is logged in (admin/staff)
        ));
    }

    public function verify_token_handler() {
        if ( ! isset( $_POST['token'] ) ) wp_send_json_error( 'Token missing' );
        
        $server_token = get_option( 'wfn_feedback_token' );
        if ( empty( $server_token ) ) wp_send_json_success( 'No token set, free access' );

        if ( $_POST['token'] === $server_token ) {
            wp_send_json_success( 'Valid token' );
        } else {
            wp_send_json_error( 'Invalid token' );
        }
    }

    /**
     * AJAX: Save Note
     */
    public function save_note_handler() {
        // Verify Nonce
        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'wfn-nonce' ) ) {
            wp_send_json_error( 'Invalid nonce' );
        }

        // Verify Token
        $server_token = get_option( 'wfn_feedback_token' );
        if ( ! empty( $server_token ) && ! is_user_logged_in() ) {
            $user_token = isset( $_POST['token'] ) ? sanitize_text_field( $_POST['token'] ) : '';
            if ( $user_token !== $server_token ) {
                wp_send_json_error( 'Unauthorized: Invalid Token' );
            }
        }

        $note = sanitize_textarea_field( $_POST['note'] );
        $x = sanitize_text_field( $_POST['pos_x'] );
        $y = sanitize_text_field( $_POST['pos_y'] );
        $url = sanitize_text_field( $_POST['url'] );
        $selector = isset($_POST['selector']) ? sanitize_text_field($_POST['selector']) : '';

        $post_id = wp_insert_post(array(
            'post_type' => 'wfn_note',
            'post_content' => $note,
            'post_title' => 'Revisi: ' . substr($note, 0, 20) . '...',
            'post_status' => 'publish'
        ));

        if( $post_id ) {
            update_post_meta( $post_id, 'wfn_x', $x );
            update_post_meta( $post_id, 'wfn_y', $y );
            update_post_meta( $post_id, 'wfn_url', $url );
            if( !empty($selector) ) {
                update_post_meta( $post_id, 'wfn_selector', $selector );
            }
            wp_send_json_success( array('id' => $post_id) );
        } else {
            wp_send_json_error();
        }
    }

    /**
     * AJAX: Get Notes
     */
    public function get_notes_handler() {
         // Verify Nonce
         if ( ! isset( $_GET['nonce'] ) || ! wp_verify_nonce( $_GET['nonce'], 'wfn-nonce' ) ) {
            wp_send_json_error( 'Invalid nonce' );
        }

        // Verify Token
        $server_token = get_option( 'wfn_feedback_token' );
        if ( ! empty( $server_token ) && ! is_user_logged_in() ) {
            $user_token = isset( $_GET['token'] ) ? sanitize_text_field( $_GET['token'] ) : '';
             if ( $user_token !== $server_token ) {
                wp_send_json_error( 'Unauthorized' );
            }
        }

        $url = sanitize_text_field( $_GET['url'] );
        $args = array(
            'post_type' => 'wfn_note',
            'posts_per_page' => -1,
            'meta_query' => array( array( 'key' => 'wfn_url', 'value' => $url, 'compare' => '=' ) )
        );
        $query = new WP_Query( $args );
        $notes = array();
        if( $query->have_posts() ) {
            while( $query->have_posts() ) {
                $query->the_post();
                $id = get_the_ID();
                
                // Get replies (comments)
                $comments = get_comments( array( 'post_id' => $id, 'order' => 'ASC' ) );
                $replies = array();
                foreach ( $comments as $comment ) {
                    $replies[] = array(
                        'id' => $comment->comment_ID,
                        'author' => $comment->comment_author,
                        'content' => $comment->comment_content,
                        'is_admin' => $comment->user_id > 0 ? true : false
                    );
                }

                $notes[] = array(
                    'id' => $id,
                    'content' => get_the_content(),
                    'meta' => array(
                        'x' => get_post_meta( $id, 'wfn_x', true ),
                        'y' => get_post_meta( $id, 'wfn_y', true ),
                        'selector' => get_post_meta( $id, 'wfn_selector', true )
                    ),
                    'replies' => $replies
                );
            }
        }
        wp_reset_postdata();
        wp_send_json_success( $notes );
    }

    /**
     * AJAX: Save Reply
     */
    public function save_reply_handler() {
        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'wfn-nonce' ) ) {
            wp_send_json_error( 'Invalid nonce' );
        }

        // Token check for guests
        $server_token = get_option( 'wfn_feedback_token' );
        if ( ! empty( $server_token ) && ! is_user_logged_in() ) {
            $user_token = isset( $_POST['token'] ) ? sanitize_text_field( $_POST['token'] ) : '';
            if ( $user_token !== $server_token ) {
                wp_send_json_error( 'Unauthorized' );
            }
        }

        $post_id = intval( $_POST['post_id'] );
        $message = sanitize_textarea_field( $_POST['message'] );

        if ( ! $post_id || empty( $message ) ) {
            wp_send_json_error( 'Missing data' );
        }

        $comment_data = array(
            'comment_post_ID' => $post_id,
            'comment_content' => $message,
            'comment_type'    => 'wfn_reply',
            'user_id'         => get_current_user_id(),
            'comment_author'  => is_user_logged_in() ? wp_get_current_user()->display_name : 'Client',
            'comment_approved' => 1
        );

        $comment_id = wp_insert_comment( $comment_data );

        if ( $comment_id ) {
            wp_send_json_success( array(
                'id' => $comment_id,
                'content' => $message,
                'author' => $comment_data['comment_author'],
                'is_admin' => is_user_logged_in()
            ) );
        } else {
            wp_send_json_error( 'Failed to save reply' );
        }
    }
}
