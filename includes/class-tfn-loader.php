<?php

class TFN_Loader {

    public function run() {
        $this->load_dependencies();
        $this->define_admin_hooks();
        $this->define_public_hooks();
    }

    private function load_dependencies() {
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-tfn-admin.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-tfn-public.php';
    }

    private function define_admin_hooks() {
        $plugin_admin = new TFN_Admin();
        $plugin_admin->init();
    }

    private function define_public_hooks() {
        $plugin_public = new TFN_Public();
        $plugin_public->init();
    }
}
