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
        if ($(e.target).closest('.wfn-pin, .wfn-chat-box, #wfn-toggle-mode').length) return;

        $('.wfn-chat-box').remove();

        let x = e.pageX;
        let y = e.pageY;

        openChatBox(null, x, y, [], null); // New note mode
    });

    // Send Message (New Note or Reply)
    $(document).on('click', '.wfn-chat-send', function () {
        let box = $(this).closest('.wfn-chat-box');
        let input = box.find('.wfn-chat-input');
        let msg = input.val().trim();
        let postId = box.data('post-id');
        let x = box.data('x');
        let y = box.data('y');

        if (!msg) return;

        let btn = $(this);
        btn.prop('disabled', true);

        if (postId) {
            // Reply to existing note
            $.post(wfn_ajax.url, {
                action: 'wfn_save_reply',
                nonce: wfn_ajax.nonce,
                post_id: postId,
                message: msg,
                token: userToken
            }, function(response) {
                btn.prop('disabled', false);
                if (response.success) {
                    appendMessage(box, msg, response.data.author, response.data.is_admin);
                    input.val('');
                } else {
                    handleAuthError(response);
                }
            });
        } else {
            // Save New Note
            $.post(wfn_ajax.url, {
                action: 'wfn_save_note',
                nonce: wfn_ajax.nonce,
                note: msg,
                pos_x: x,
                pos_y: y,
                url: window.location.href,
                token: userToken
            }, function (response) {
                btn.prop('disabled', false);
                if (response.success) {
                    box.data('post-id', response.data.id);
                    box.find('.wfn-chat-title').text('Revisi #' + response.data.id);
                    appendMessage(box, msg, 'Anda', true); // Assume creator is "you"
                    input.val('');
                    loadPins(); // Refresh pins
                } else {
                    handleAuthError(response);
                }
            });
        }
    });

    function handleAuthError(response) {
        let errorMsg = response.data || 'Error';
        if (typeof errorMsg === 'string' && errorMsg.indexOf('Unauthorized') !== -1) {
            alert('Token tidak valid atau telah berubah. Silakan masukan token baru.');
            localStorage.removeItem('wfn_client_token');
            userToken = null;
            $('.wfn-chat-box').remove();
            promptForToken();
        } else {
            alert('Gagal: ' + errorMsg);
        }
    }

    function appendMessage(box, msg, author, isAdmin) {
        let body = box.find('.wfn-chat-body');
        let msgClass = isAdmin ? 'wfn-msg-admin' : 'wfn-msg-client';
        let html = `
            <div class='wfn-chat-message ${msgClass}'>
                <div class='wfn-msg-author'>${author}</div>
                ${msg}
            </div>
            <div class='wfn-clearfix'></div>
        `;
        body.append(html);
        body.scrollTop(body[0].scrollHeight);
    }

    function openChatBox(postId, x, y, messages, noteContent) {
        $('.wfn-chat-box').remove();

        let left = Math.min(x + 30, window.innerWidth - 350);
        let top = Math.min(y, window.innerHeight - 480);

        let title = postId ? 'Revisi #' + postId : 'Revisi Baru';

        let html = `
            <div class='wfn-chat-box' data-post-id='${postId || ''}' data-x='${x}' data-y='${y}' style='top:${top}px; left:${left}px'>
                <div class='wfn-chat-header'>
                    <span class='wfn-chat-title'>${title}</span>
                    <span class='wfn-chat-close'>&times;</span>
                </div>
                <div class='wfn-chat-body'></div>
                <div class='wfn-chat-footer'>
                    <input type='text' class='wfn-chat-input' placeholder='Tulis pesan...'>
                    <button class='wfn-chat-send'>➤</button>
                </div>
            </div>
        `;
        $('body').append(html);

        let box = $('.wfn-chat-box');

        // If this is an existing note, show the original note content first
        if (noteContent) {
            appendMessage(box, noteContent, 'Client', false);
        }

        // Then show replies
        if (messages && messages.length > 0) {
            messages.forEach(m => {
                appendMessage(box, m.content, m.author, m.is_admin);
            });
        }

        box.find('.wfn-chat-input').focus();
    }

    $(document).on('click', '.wfn-chat-close', function () {
        $(this).closest('.wfn-chat-box').remove();
    });

    $(document).on('keypress', '.wfn-chat-input', function(e) {
        if (e.which === 13) {
            $(this).closest('.wfn-chat-box').find('.wfn-chat-send').click();
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
            token: userToken
        }, function (response) {
            if (response.success) {
                $('.wfn-pin').remove();
                response.data.forEach(function (pin) {
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.content, pin.replies);
                });
            } else {
                if (response.data === 'Unauthorized') {
                    localStorage.removeItem('wfn_client_token');
                    userToken = null;
                }
            }
        });
    }

    function addPinToScreen(id, x, y, content, replies) {
        let pin = `<div class='wfn-pin' data-id='${id}' style='top:${y}px; left:${x}px'><span>!</span></div>`;
        $('body').append(pin);

        let pinEl = $('.wfn-pin').last();
        pinEl.data('content', content);
        pinEl.data('replies', replies || []);

        pinEl.on('click', function (e) {
            e.stopPropagation();
            let noteContent = $(this).data('content');
            let noteReplies = $(this).data('replies');
            openChatBox(id, parseFloat(x), parseFloat(y), noteReplies, noteContent);
        });
    }
});
