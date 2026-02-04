<?php

class WFN_Admin {

    public function init() {
        add_action( 'init', array( $this, 'register_cpt' ) );
        add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    public function add_settings_page() {
        add_submenu_page(
            'edit.php?post_type=wfn_note',
            'Token Settings',
            'Token Access',
            'manage_options',
            'wfn-settings',
            array( $this, 'render_settings_page' )
        );
    }

    public function register_settings() {
        register_setting( 'wfn_options_group', 'wfn_feedback_token' );
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>WP Feedback Notes Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields( 'wfn_options_group' ); ?>
                <?php do_settings_sections( 'wfn_options_group' ); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Client Access Token</th>
                        <td>
                            <input type="text" id="wfn_token_input" name="wfn_feedback_token" value="<?php echo esc_attr( get_option('wfn_feedback_token') ); ?>" style="width: 300px;" />
                            <button type="button" class="button" onclick="generateToken()">Generate Random Token</button>
                            <p class="description">Enter a secret token. Clients must enter this token to add comments.</p>
                            <script>
                            function generateToken() {
                                var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                                var token = '';
                                for (var i = 0; i < 16; i++) {
                                    token += chars[Math.floor(Math.random() * chars.length)];
                                }
                                document.getElementById('wfn_token_input').value = token;
                            }
                            </script>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * 3. BACKEND: Custom Post Type
     * Agar masuk ke Module Themify, 'public' harus true.
     */
    public function register_cpt() {
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
            'supports'           => array( 'title', 'editor', 'custom-fields', 'comments' ),
        );

        register_post_type( 'wfn_note', $args );
    }
}
