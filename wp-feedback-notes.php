<?php
/*
Plugin Name: Wordpress Feedback (Shortcode)
Description: Menambahkan fitur komentar visual. Gunakan shortcode [figma_feedback] di wordpress.
Version: 2.4
Author: Radit
*/

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-wfn-loader.php';

/**
 * Began execution of the plugin.
 */
function run_wp_feedback_notes() {
    $plugin = new WFN_Loader();
    $plugin->run();
}
run_wp_feedback_notes();