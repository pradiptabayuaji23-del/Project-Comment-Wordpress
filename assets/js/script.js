jQuery(document).ready(function ($) {

    if ($('body').hasClass('themify_builder_active')) return;

    let userToken = null;
    let tokenData = localStorage.getItem('wfn_client_token'); // Expect JSON now {token: '...', expiry: 123}
    
    if (tokenData) {
        try {
            let parsed = JSON.parse(tokenData);
            if (Date.now() < parsed.expiry) {
                userToken = parsed.token;
            } else {
                localStorage.removeItem('wfn_client_token');
                console.log('Token expired');
            }
        } catch(e) {
            // Legacy/Invalid format
            localStorage.removeItem('wfn_client_token');
        }
    }

    // Inject Overlay
    if ($('#wfn-canvas-overlay').length === 0) {
        $('body').append('<div id="wfn-canvas-overlay"></div>');
    }

    // Load Pins LANGSUNG if not requiring token or if we have token (verify first?)
    // Better: Try to load. If fail 403, prompt. But simple approach:
    // If require_token is true, don't load pins until unlocked.
    if (typeof wfn_ajax !== 'undefined') {
        if (!wfn_ajax.require_token) {
            loadPins();
        } else if (userToken) {
            // Validate token silently? Or just try to load pins.
            loadPins();
        }
    }

    let isModeActive = false;

    // Toggle Button Logic
    $(document).on('click', '#wfn-toggle-mode', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (wfn_ajax.require_token && !userToken) {
            promptForToken();
            return;
        }

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

    function promptForToken() {
        let tokenHtml = `
            <div id='wfn-token-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999999; display:flex; justify-content:center; align-items:center;'>
                <div style='background:#fff; padding:20px; border-radius:8px; text-align:center; width:300px;'>
                    <h3>Masukan Token Akses</h3>
                    <p>Admin mewajibkan token untuk memberi komentar.</p>
                    <input type='text' id='wfn-token-input' placeholder='Masukan Token...' style='width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px;'>
                    <button id='wfn-submit-token' style='background:#E91E63; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;'>Masuk</button>
                    <button id='wfn-cancel-token' style='background:#eee; color:#333; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-left:5px;'>Batal</button>
                </div>
            </div>
        `;
        $('body').append(tokenHtml);
    }

    $(document).on('click', '#wfn-cancel-token', function() {
        $('#wfn-token-modal').remove();
    });

    $(document).on('click', '#wfn-submit-token', function() {
        let input = $('#wfn-token-input').val();
        if (!input) return;

        $(this).text('Verifikasi...');
        
        $.post(wfn_ajax.url, {
            action: 'wfn_verify_token',
            nonce: wfn_ajax.nonce,
            token: input
        }, function(response) {
            if (response.success) {
                userToken = input;
                // Save with expiry 24h
                let expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
                localStorage.setItem('wfn_client_token', JSON.stringify({ token: userToken, expiry: expiry }));
                
                $('#wfn-token-modal').remove();
                alert('Token valid! Silakan aktifkan mode komentar.');
                loadPins(); // Load pins now
            } else {
                alert('Token salah!');
                $('#wfn-submit-token').text('Masuk');
            }
        });
    });

    // Klik Overlay (Add Note)
    $(document).on('click', '#wfn-canvas-overlay', function (e) {
        if ($(e.target).closest('.wfn-pin, .wfn-comment-box, #wfn-toggle-mode').length) return;

        $('.wfn-comment-box').remove();

        let x = e.pageX;
        let y = e.pageY;

        let inputHtml = `
            <div class='wfn-comment-box' style='position:fixed; top:${y}px; left:${x}px'>
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
                url: window.location.href,
                token: userToken // Pass token
            }, function (response) {
                if (response.success) {
                    addPinToScreen(response.data.id, x, y, msg);
                    box.remove();
                } else {
                    // Check for Unauthorized
                    let errorMsg = response.data || 'Error';
                    if (typeof errorMsg === 'string' && errorMsg.indexOf('Unauthorized') !== -1) {
                         alert('Token tidak valid atau telah berubah. Silakan masukan token baru.');
                         localStorage.removeItem('wfn_client_token');
                         userToken = null;
                         box.remove();
                         promptForToken(); // Prompt again
                    } else {
                        alert('Gagal menyimpan: ' + errorMsg);
                        btn.text('Simpan');
                    }
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
            url: window.location.href,
            token: userToken // Pass token
        }, function (response) {
            if (response.success) {
                $('.wfn-pin').remove(); // Refresh agar tidak duplikat
                response.data.forEach(function (pin) {
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.content);
                });
            } else {
                // If failed due to auth, maybe clear token? 
                if (response.data === 'Unauthorized') {
                   localStorage.removeItem('wfn_client_token');
                   userToken = null;
                   console.log('Token expired or invalid');
                }
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
