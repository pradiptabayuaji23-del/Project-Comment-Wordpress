jQuery(document).ready(function ($) {

    if ($('body').hasClass('themify_builder_active')) return;

    // Inject Overlay
    if ($('#wfn-canvas-overlay').length === 0) {
        $('body').append('<div id="wfn-canvas-overlay"></div>');
    }

    // Load Pins LANGSUNG
    loadPins();

    let isModeActive = false;

    // Toggle Button Logic
    $(document).on('click', '#wfn-toggle-mode', function (e) {
        e.preventDefault();
        e.stopPropagation();

        isModeActive = !isModeActive;

        if (isModeActive) {
            $('#wfn-canvas-overlay').fadeIn(200);
            $(this).text('Keluar Mode Komentar').css('background', '#E91E63');
        } else {
            $('#wfn-canvas-overlay').fadeOut(200);
            $(this).text('Aktifkan Mode Komentar').css('background', '#222');
            $('.wfn-comment-box').remove();
        }
    });

    // Klik Overlay (Add Note)
    $(document).on('click', '#wfn-canvas-overlay', function (e) {
        if ($(e.target).closest('.wfn-pin, .wfn-comment-box, #wfn-toggle-mode').length) return;

        $('.wfn-comment-box').remove();

        let x = e.pageX;
        let y = e.pageY;

        let inputHtml = `
            <div class='wfn-comment-box' style='top:${y}px; left:${x}px'>
                <textarea placeholder='Tulis revisi di sini...'></textarea>
                <div class='wfn-btn-group'>
                    <button class='wfn-cancel-btn'>Batal</button>
                    <button class='wfn-save-btn'>Simpan</button>
                </div>
            </div>
        `;
        $('body').append(inputHtml);
        $('.wfn-save-btn').data('x', x).data('y', y);
    });

    // Save Note
    $(document).on('click', '.wfn-save-btn', function () {
        let box = $(this).closest('.wfn-comment-box');
        let msg = box.find('textarea').val();
        let x = $(this).data('x');
        let y = $(this).data('y');

        if (msg && typeof wfn_ajax !== 'undefined') {
            let btn = $(this);
            btn.text('...');
            $.post(wfn_ajax.url, {
                action: 'wfn_save_note',
                nonce: wfn_ajax.nonce,
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

    $(document).on('click', '.wfn-cancel-btn', function () {
        $(this).closest('.wfn-comment-box').remove();
    });

    function loadPins() {
        if (typeof wfn_ajax === 'undefined') return;
        $.get(wfn_ajax.url, {
            action: 'wfn_get_notes',
            nonce: wfn_ajax.nonce,
            url: window.location.href
        }, function (response) {
            if (response.success) {
                $('.wfn-pin').remove(); // Refresh agar tidak duplikat
                response.data.forEach(function (pin) {
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.content);
                });
            }
        });
    }

    function addPinToScreen(id, x, y, msg) {
        let pin = `<div class='wfn-pin' title='${msg}' style='top:${y}px; left:${x}px'><span>!</span></div>`;
        $('body').append(pin);

        // Event Click Pin
        $('.wfn-pin').last().on('click', function (e) {
            e.stopPropagation();
            alert(msg);
        });
    }
});
