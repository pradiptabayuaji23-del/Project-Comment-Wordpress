<?php

class WFN_Loader {

    public function run() {
        $this->load_dependencies();
        $this->define_admin_hooks();
        $this->define_public_hooks();
    }

    private function load_dependencies() {
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-wfn-admin.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-wfn-public.php';
    }

    private function define_admin_hooks() {
        $plugin_admin = new WFN_Admin();
        $plugin_admin->init();
    }

    private function define_public_hooks() {
        $plugin_public = new WFN_Public();
        $plugin_public->init();
    }
}
