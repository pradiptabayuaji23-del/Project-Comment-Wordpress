<?php

class WFN_Admin {

    public function init() {
        add_action( 'init', array( $this, 'register_cpt' ) );
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
            'supports'           => array( 'title', 'editor', 'custom-fields' ),
        );

        register_post_type( 'wfn_note', $args );
    }
}
