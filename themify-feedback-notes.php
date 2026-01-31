<?php
/*
Plugin Name: Themify Figma-Style Feedback (Shortcode)
Description: Menambahkan fitur komentar visual. Gunakan shortcode [figma_feedback] di modul Text Themify.
Version: 2.3
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
require plugin_dir_path( __FILE__ ) . 'includes/class-tfn-loader.php';

/**
 * Began execution of the plugin.
 */
function run_themify_feedback_notes() {
    $plugin = new TFN_Loader();
    $plugin->run();
}
run_themify_feedback_notes();