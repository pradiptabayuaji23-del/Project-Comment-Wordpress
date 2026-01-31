jQuery(document).ready(function ($) {

    if ($('body').hasClass('themify_builder_active')) return;

    // Inject Overlay
    if ($('#tfn-canvas-overlay').length === 0) {
        $('body').append('<div id="tfn-canvas-overlay"></div>');
    }

    // Load Pins LANGSUNG
    loadPins();

    let isModeActive = false;

    // Toggle Button Logic
    $(document).on('click', '#tfn-toggle-mode', function (e) {
        e.preventDefault();
        e.stopPropagation();

        isModeActive = !isModeActive;

        if (isModeActive) {
            $('#tfn-canvas-overlay').fadeIn(200);
            $(this).text('Keluar Mode Komentar').css('background', '#E91E63');
        } else {
            $('#tfn-canvas-overlay').fadeOut(200);
            $(this).text('Aktifkan Mode Komentar').css('background', '#222');
            $('.tfn-comment-box').remove();
        }
    });

    // Klik Overlay (Add Note)
    $(document).on('click', '#tfn-canvas-overlay', function (e) {
        if ($(e.target).closest('.tfn-pin, .tfn-comment-box, #tfn-toggle-mode').length) return;

        $('.tfn-comment-box').remove();

        let x = e.pageX;
        let y = e.pageY;

        let inputHtml = `
            <div class='tfn-comment-box' style='top:${y}px; left:${x}px'>
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
    $(document).on('click', '.tfn-save-btn', function () {
        let box = $(this).closest('.tfn-comment-box');
        let msg = box.find('textarea').val();
        let x = $(this).data('x');
        let y = $(this).data('y');

        if (msg && typeof tfn_ajax !== 'undefined') {
            let btn = $(this);
            btn.text('...');
            $.post(tfn_ajax.url, {
                action: 'tfn_save_note',
                nonce: tfn_ajax.nonce,
                note: msg,
                pos_x: x,
                pos_y: y,
                url: window.location.href
            }, function (response) {
                if (response.success) {
                    addPinToScreen(response.data.id, x, y, msg);
                    box.remove();
                } else {
                    alert('Gagal menyimpan komentar.');
                    btn.text('Simpan');
                }
            }).fail(function () {
                alert('Terjadi kesalahan jaringan.');
                btn.text('Simpan');
            });
        }
    });

    $(document).on('click', '.tfn-cancel-btn', function () {
        $(this).closest('.tfn-comment-box').remove();
    });

    function loadPins() {
        if (typeof tfn_ajax === 'undefined') return;
        $.get(tfn_ajax.url, {
            action: 'tfn_get_notes',
            nonce: tfn_ajax.nonce,
            url: window.location.href
        }, function (response) {
            if (response.success) {
                $('.tfn-pin').remove(); // Refresh agar tidak duplikat
                response.data.forEach(function (pin) {
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.content);
                });
            }
        });
    }

    function addPinToScreen(id, x, y, msg) {
        let pin = `<div class='tfn-pin' title='${msg}' style='top:${y}px; left:${x}px'><span>!</span></div>`;
        $('body').append(pin);

        // Event Click Pin
        $('.tfn-pin').last().on('click', function (e) {
            e.stopPropagation();
            alert(msg);
        });
    }
});
