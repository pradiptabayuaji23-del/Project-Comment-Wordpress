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

    // Helper: Generate unique selector
    function getUniqueSelector(el) {
        if (el.id) return '#' + el.id;
        if (el === document.body) return 'body';

        let path = [];
        while (el.parentNode) {
            let tag = el.tagName.toLowerCase();
            if (el.id) {
                path.unshift('#' + el.id);
                break;
            } else {
                let sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.tagName.toLowerCase() === tag) nth++;
                }
                path.unshift(tag + ':nth-of-type(' + nth + ')');
            }
            el = el.parentNode;
        }
        return path.join(' > ');
    }
    
    // Helper: Get Safe Anchor (Avoid void elements like img, input)
    function getSafeAnchor(el) {
        const voidTags = ['img', 'input', 'br', 'hr', 'embed', 'source', 'track', 'wbr', 'area', 'col'];
        const tag = el.tagName.toLowerCase();
        
        // If it's a void tag or SVG part, go up to parent
        if (voidTags.includes(tag) || el instanceof SVGElement) {
            return el.parentElement || document.body;
        }
        return el;
    }

    // Klik Overlay (Tambah Catatan)
    $(document).on('click', '#wfn-canvas-overlay', function (e) {
        // Jika Admin, jangan izinkan buat catatan baru
        if (wfn_ajax.is_admin) {
            alert('Admin hanya bisa melihat catatan, tidak bisa membuat baru.');
            return;
        }

        // Sembunyikan overlay sementara untuk menemukan elemen di bawahnya
        $(this).hide();
        let rawTarget = document.elementFromPoint(e.clientX, e.clientY);
        $(this).show();

        if (!rawTarget || rawTarget === document.body || rawTarget === document.documentElement) {
            rawTarget = document.body;
        }
        
        let targetEl = getSafeAnchor(rawTarget);

        if ($(e.target).closest('.wfn-pin, .wfn-chat-box, #wfn-toggle-mode').length) return;

        $('.wfn-chat-box').remove();

        // Hitung posisi relatif dalam elemen target
        let rect = targetEl.getBoundingClientRect();
        
        // Koordinat relatif terhadap elemen (0-100%)
        let relX = (e.clientX - rect.left) / rect.width * 100;
        let relY = (e.clientY - rect.top) / rect.height * 100;
        
        // Batasi 0-100 agar tetap di dalam
        relX = Math.max(0, Math.min(100, relX));
        relY = Math.max(0, Math.min(100, relY));

        let selector = getUniqueSelector(targetEl);

        // Simpan data sementara
        window.wfnCurrentPin = {
            selector: selector,
            relX: relX,
            relY: relY,
            absX: e.pageX, // Fallback/Visual
            absY: e.pageY  // Fallback/Visual
        };

        openChatBox(null, e.pageX, e.pageY, [], null); // Mode catatan baru
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
            let postData = {
                action: 'wfn_save_note',
                nonce: wfn_ajax.nonce,
                note: msg,
                pos_x: x, // Legacy/Fallback
                pos_y: y, // Legacy/Fallback
                url: window.location.href,
                token: userToken
            };

            // If we have selector data, send it
            if (window.wfnCurrentPin) {
                postData.selector = window.wfnCurrentPin.selector;
                postData.pos_x = window.wfnCurrentPin.relX; // Overwrite with %
                postData.pos_y = window.wfnCurrentPin.relY; // Overwrite with %
            }

            $.post(wfn_ajax.url, postData, function (response) {
                let tempPin = window.wfnCurrentPin;
                window.wfnCurrentPin = null; 

                btn.prop('disabled', false);
                if (response.success) {
                    box.data('post-id', response.data.id);
                    box.find('.wfn-chat-title').text('Revisi #' + response.data.id);
                    appendMessage(box, msg, 'Anda', true); // Assume creator is "you"
                    input.val('');
                    
                    if (tempPin && tempPin.selector) {
                        addPinToScreen(response.data.id, tempPin.relX, tempPin.relY, tempPin.selector, msg, []);
                    } else {
                         addPinToScreen(response.data.id, x, y, null, msg, []);
                    }
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
        
        left = Math.max(10, left);
        top = Math.max(10, top);

        let title = postId ? 'Revisi #' + postId : 'Revisi Baru';

        // Logika Footer:
        // Hapus fitur balasan (Reply). Input hanya muncul jika ini Catatan Baru (!postId).
        // Jika catatan sudah ada, tidak ada input (View Only untuk semua).
        let footerHtml = '';
        
        if (!postId) {
            // Hanya tampilkan input untuk catatan BARU
            footerHtml = `
                <div class='wfn-chat-footer'>
                    <input type='text' class='wfn-chat-input' placeholder='Tulis pesan...'>
                    <button class='wfn-chat-send'>➤</button>
                </div>
            `;
        } else {
             // Catatan lama = View Only (Tanpa footer)
             footerHtml = '';
        }

        let html = `
            <div class='wfn-chat-box' data-post-id='${postId || ''}' data-x='${x}' data-y='${y}' style='top:${top}px; left:${left}px'>
                <div class='wfn-chat-header'>
                    <span class='wfn-chat-title'>${title}</span>
                    <span class='wfn-chat-close'>&times;</span>
                </div>
                <div class='wfn-chat-body'></div>
                ${footerHtml}
            </div>
        `;
        $('body').append(html);

        let box = $('.wfn-chat-box');

        if (noteContent) {
            appendMessage(box, noteContent, 'Client', false);
        }

        if (messages && messages.length > 0) {
            messages.forEach(m => {
                appendMessage(box, m.content, m.author, m.is_admin);
            });
        }

        if(!postId) {
            box.find('.wfn-chat-input').focus();
        }
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

    // Remove old resize handler (no longer needed)
    $(window).off('resize.wfn'); 

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
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.meta.selector, pin.content, pin.replies);
                });
            } else {
                if (response.data === 'Unauthorized') {
                    localStorage.removeItem('wfn_client_token');
                    userToken = null;
                }
            }
        });
    }

    function addPinToScreen(id, x, y, selector, content, replies) {
        let pin = `<div class='wfn-pin' data-id='${id}' data-selector='${selector || ''}'><span>!</span></div>`;
        let $pin = $(pin);
        let appended = false;

        if (selector && $(selector).length > 0) {
            let el = $(selector);
            // Ensure relative positioning
            if (el.css('position') === 'static') {
                el.css('position', 'relative');
            }
            el.append($pin);
            $pin.css({
                top: parseFloat(y) + '%',
                left: parseFloat(x) + '%',
                position: 'absolute'
            });
            appended = true;
        } 
        
        if (!appended) {
            // Legacy/Fallback
            if (!selector) {
                $('body').append($pin);
                $pin.css({
                    top: y + 'px',
                    left: x + 'px',
                    position: 'absolute'
                });
            } else {
                 return; 
            }
        }

        $pin.data('content', content);
        $pin.data('replies', replies || []);

        $pin.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            let noteContent = $(this).data('content');
            let noteReplies = $(this).data('replies');
            let rect = this.getBoundingClientRect();
            openChatBox(id, rect.left, rect.top, noteReplies, noteContent);
        });
    }
});
