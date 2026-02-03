# WP Visual Feedback 💬

A lightweight, universal WordPress plugin that brings **Figma-style visual commenting** directly to your live website.

This tool allows clients, developers, and designers to leave "pin-point" revision notes on any page element. Built with a clean architecture, it works seamlessly with any Page Builder (Themify, Elementor, Divi) or standard WordPress theme.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![WordPress](https://img.shields.io/badge/WordPress-5.0%2B-blue)
![License](https://img.shields.io/badge/License-GPLv2-green)

## ✨ Key Features

* **Point & Click Annotation:** Click anywhere on the screen to pin a comment.
* **Real-time Overlay:** Toggle the "Comment Mode" to interact with the design without affecting the site layout.
* **Universal Compatibility:** Works with any theme or builder (Themify, Elementor, Gutenberg, etc.).
* **Clean Backend Management:** All comments are stored as a Custom Post Type (`Catatan Revisi`) for easy management in the WP Admin Dashboard.
* **Responsive:** Works on desktop and mobile views.
* **AJAX-Driven:** Fast saving and loading without page refreshes.

## 🛠️ Installation

1.  Download or Clone this repository.
    ```bash
    git clone [https://github.com/pradiptabayuaji23-del/Project-Comment-Wordpress.git](https://github.com/pradiptabayuaji23-del/Project-Comment-Wordpress.git)
    ```
2.  Compress the folder into a `.zip` file (if installing via WP Admin) or upload the folder directly to `/wp-content/plugins/`.
3.  Go to your **WordPress Dashboard > Plugins**.
4.  Activate **WP Visual Feedback**.

## 🚀 Usage

### Frontend (For Clients/Users)
1.  Add the shortcode `[visual_feedback]` to any page (inside a Text Module, Shortcode Block, or Footer widget).
2.  A floating button **"Aktifkan Mode Komentar"** will appear in the bottom-right corner (visible only to logged-in users).
3.  Click the button to enable the overlay.
4.  Click anywhere on the web page to pin a note.
5.  Write your feedback and click **Simpan** (Save).

### Backend (For Admin/Developers)
1.  Go to the WordPress Admin Dashboard.
2.  Navigate to the **"Catatan Revisi"** menu in the sidebar.
3.  Here you can view, edit, or delete all feedback notes submitted from the frontend.
4.  Since the CPT is public, you can also use Query Loops or Post Modules (like in Themify/Elementor) to display these notes in a list format on a specific page.

## 💻 Technical Architecture

The plugin is structured to avoid "spaghetti code" by separating concerns:

* **Shortcode Handler:** Registers the frontend trigger mechanism.
* **Asset Manager:** Enqueues necessary CSS/JS only when needed, with fallback support for non-Themify themes.
* **AJAX Handler:** Securely processes data transmission between the frontend overlay and the database.
* **CPT Registrar:** Defines the `wvf_note` post type with appropriate visibility settings for Builder integration.

## 🤝 Compatibility

This plugin has been tested and confirmed to work with:
* **Themify Builder** (Ultra, Shoppe, etc.)
* **Elementor / Elementor Pro**
* **Gutenberg (Block Editor)**
* **Classic Editor**

## 👤 Author

**Pradipta Bayuaji**
* GitHub: [@pradiptabayuaji23-del](https://github.com/pradiptabayuaji23-del)

---
*Note: This project was created to streamline the web development feedback loop.*