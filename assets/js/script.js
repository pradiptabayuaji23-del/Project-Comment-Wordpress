jQuery(document).ready(function ($) {

    if ($('body').hasClass('themify_builder_active')) return;

    let userToken = null;
    let tokenData = localStorage.getItem('wfn_client_token'); 
    
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
            localStorage.removeItem('wfn_client_token');
        }
    }

    // Inject Overlay
    if ($('#wfn-canvas-overlay').length === 0) {
        $('body').append('<div id="wfn-canvas-overlay"></div>');
    }

    if (typeof wfn_ajax !== 'undefined') {
        if (!wfn_ajax.require_token) {
            loadPins();
        } else if (userToken) {
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
                let expiry = Date.now() + (24 * 60 * 60 * 1000); 
                localStorage.setItem('wfn_client_token', JSON.stringify({ token: userToken, expiry: expiry }));
                
                $('#wfn-token-modal').remove();
                alert('Token valid! Silakan aktifkan mode komentar.');
                loadPins(); 
            } else {
                alert('Token salah!');
                $('#wfn-submit-token').text('Masuk');
            }
        });
    });

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
    
    function getSafeAnchor(el) {
        const voidTags = ['img', 'input', 'br', 'hr', 'embed', 'source', 'track', 'wbr', 'area', 'col'];
        const tag = el.tagName.toLowerCase();
        
        if (voidTags.includes(tag) || el instanceof SVGElement) {
            return el.parentElement || document.body;
        }
        return el;
    }

    $(document).on('click', '#wfn-canvas-overlay', function (e) {
        if (wfn_ajax.is_admin) {
            alert('Admin hanya bisa melihat catatan, tidak bisa membuat baru.');
            return;
        }

        $(this).hide();
        let rawTarget = document.elementFromPoint(e.clientX, e.clientY);
        $(this).show();

        if (!rawTarget || rawTarget === document.body || rawTarget === document.documentElement) {
            rawTarget = document.body;
        }
        
        let targetEl = getSafeAnchor(rawTarget);

        if ($(e.target).closest('.wfn-pin, .wfn-chat-box, #wfn-toggle-mode').length) return;

        $('.wfn-chat-box').remove();

        let rect = targetEl.getBoundingClientRect();
        let relX = (e.clientX - rect.left) / rect.width * 100;
        let relY = (e.clientY - rect.top) / rect.height * 100;
        
        relX = Math.max(0, Math.min(100, relX));
        relY = Math.max(0, Math.min(100, relY));

        let selector = getUniqueSelector(targetEl);

        window.wfnCurrentPin = {
            selector: selector,
            relX: relX,
            relY: relY,
            absX: e.pageX, 
            absY: e.pageY 
        };

        openChatBox(null, e.pageX, e.pageY, [], null); 
    });

    // Cancel Edit Mode (Footer)
    $(document).on('click', '.wfn-cancel-edit-mode', function() {
        let box = $(this).closest('.wfn-chat-box');
        resetEditMode(box);
    });

    function resetEditMode(box) {
        box.data('edit-id', null);
        box.data('edit-type', null);
        box.data('edit-el', null);
        
        let input = box.find('.wfn-chat-input');
        input.val('');
        input.removeClass('wfn-editing-mode').css('border-color', '');
        
        // Reset Send Button Icon (Paper Plane)
        box.find('.wfn-chat-send').html('<iconify-icon icon="mdi:send" width="20" height="20"></iconify-icon>').attr('title', 'Kirim');
        box.find('.wfn-cancel-edit-mode').remove();
    }

    // Send Message (New Note, Reply, or Edit)
    $(document).on('click', '.wfn-chat-send', function () {
        let box = $(this).closest('.wfn-chat-box');
        let input = box.find('.wfn-chat-input');
        let msg = input.val().trim();
        let postId = box.data('post-id');
        let x = box.data('x');
        let y = box.data('y');

        let editId = box.data('edit-id');
        let editType = box.data('edit-type');
        
        let fileInput = box.find('#wfn-file-upload');
        let file = fileInput.length ? fileInput[0].files[0] : null;

        if (!msg && !file) return;

        let btn = $(this);
        btn.prop('disabled', true);

        // --- EDIT MODE ---
        if (editId && editType) {
             $.post(wfn_ajax.url, {
                action: 'wfn_edit_message',
                nonce: wfn_ajax.nonce,
                id: editId,
                type: editType,
                content: msg,
                token: userToken
            }, function(response) {
                btn.prop('disabled', false);
                if (response.success) {
                    let msgElId = box.data('edit-el');
                    if(msgElId) {
                        $('#' + msgElId).find('.wfn-msg-content').text(msg);
                    }
                    resetEditMode(box);
                } else {
                    alert('Gagal menyimpan: ' + (response.data || 'Error'));
                }
            });
            return;
        }

        let formData = new FormData();
        formData.append('nonce', wfn_ajax.nonce);
        formData.append('token', userToken || '');
        if (file) {
            formData.append('wfn_image', file);
        }

        // --- NEW/REPLY MODE ---
        if (postId) {
            formData.append('action', 'wfn_save_reply');
            formData.append('post_id', postId);
            formData.append('message', msg);

            $.ajax({
                url: wfn_ajax.url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    btn.prop('disabled', false);
                    if (response.success) {
                        appendMessage(box, msg, response.data.author, response.data.is_admin, response.data.id, 'comment', response.data.image_url);
                        input.val('');
                        if(fileInput.length) {
                             fileInput.val('');
                             $('#wfn-file-preview').hide();
                        }
                        
                         // BUG FIX: Update PIN data so it persists without refresh
                        let pin = $(`.wfn-pin[data-id="${postId}"]`);
                        if (pin.length) {
                            let replies = pin.data('replies') || [];
                            replies.push({
                                id: response.data.id,
                                author: response.data.author,
                                content: msg,
                                is_admin: response.data.is_admin,
                                image_url: response.data.image_url
                            });
                            pin.data('replies', replies);
                        }
                    } else {
                        handleAuthError(response);
                    }
                }
            });
        } else {
            formData.append('action', 'wfn_save_note');
            formData.append('note', msg);
            formData.append('pos_x', x);
            formData.append('pos_y', y);
            formData.append('url', window.location.href);

            if (window.wfnCurrentPin) {
                formData.append('selector', window.wfnCurrentPin.selector);
                formData.append('pos_x', window.wfnCurrentPin.relX);
                formData.append('pos_y', window.wfnCurrentPin.relY);
            }

             $.ajax({
                url: wfn_ajax.url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    let tempPin = window.wfnCurrentPin;
                    window.wfnCurrentPin = null; 

                    btn.prop('disabled', false);
                    if (response.success) {
                        box.data('post-id', response.data.id);
                        box.find('.wfn-chat-title').text('Revisi #' + response.data.id);
                        appendMessage(box, msg, 'Anda', false, response.data.id, 'post', response.data.image_url); 
                        input.val('');
                        if(fileInput.length) {
                             fileInput.val('');
                             $('#wfn-file-preview').hide();
                        }
                        
                        if (tempPin && tempPin.selector) {
                            addPinToScreen(response.data.id, tempPin.relX, tempPin.relY, tempPin.selector, msg, [], response.data.image_url);
                        } else {
                             addPinToScreen(response.data.id, x, y, null, msg, [], response.data.image_url);
                        }
                    } else {
                        handleAuthError(response);
                    }
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

    function appendMessage(box, msg, author, isAdmin, id = null, type = null, imageUrl = null) {
        let body = box.find('.wfn-chat-body');
        let msgClass = isAdmin ? 'wfn-msg-admin' : 'wfn-msg-client';

        if (!wfn_ajax.is_admin && !isAdmin) {
            author = 'Anda';
        }
        
        let editBtn = '';
        if (!isAdmin && id && !wfn_ajax.is_admin) {
            // Edit button (Pencil)
            editBtn = `<span class='wfn-edit-msg' data-id='${id}' data-type='${type}' title='Edit' style='cursor:pointer; margin-left:8px; font-size:16px; color:#999; display:inline-flex; align-items:center;'><iconify-icon icon="mdi:pencil" width="16" height="16"></iconify-icon></span>`;
        }

        let imageHtml = '';
        if (imageUrl) {
            imageHtml = `<div style="margin-top:5px;"><a href="${imageUrl}" target="_blank"><img src="${imageUrl}" style="max-width:100%; border-radius:4px; max-height: 200px;"></a></div>`;
        }

        let html = `
            <div class='wfn-chat-message ${msgClass}' id='wfn-msg-${type}-${id}'>
                <div class='wfn-msg-author' style='display:flex; align-items:center; justify-content:space-between;'>
                    <span>${author}</span>
                    ${editBtn}
                </div>
                <div class='wfn-msg-content' style='margin-top:2px;'>${msg}</div>
                ${imageHtml}
            </div>
            <div class='wfn-clearfix'></div>
        `;
        body.append(html); // Fixed: Remove duplicate
        
        // No Scan needed for <iconify-icon>
        
        body.scrollTop(body[0].scrollHeight);
    }

    // Edit Button Click
    $(document).on('click', '.wfn-edit-msg', function(e) {
        e.stopPropagation();
        let btn = $(this);
        let container = btn.closest('.wfn-chat-message');
        let contentDiv = container.find('.wfn-msg-content');
        let originalText = contentDiv.text(); 
        
        let box = btn.closest('.wfn-chat-box');
        let input = box.find('.wfn-chat-input');
        let sendBtn = box.find('.wfn-chat-send');
        
        input.val(originalText);
        input.focus();
        
        let id = btn.data('id');
        let type = btn.data('type');
        box.data('edit-id', id);
        box.data('edit-type', type);
        box.data('edit-el', container.attr('id'));

        // Change UI to Edit Mode
        box.find('.wfn-chat-input').addClass('wfn-editing-mode').css('border-color', '#ffc107');
        
        // Check Icon
        let sendBtnHtml = '<iconify-icon icon="mdi:check" width="20" height="20"></iconify-icon>';
        sendBtn.html(sendBtnHtml).attr('title', 'Simpan Perubahan');
        
        // Close Icon
        if (box.find('.wfn-cancel-edit-mode').length === 0) {
             sendBtn.after(`<button class='wfn-cancel-edit-mode' style='background:#ccc; color:#333; border:none; width:38px; height:38px; border-radius:6px; cursor:pointer; margin-left:5px; font-size:14px; display:flex; align-items:center; justify-content:center;'><iconify-icon icon="mdi:close" width="20" height="20"></iconify-icon></button>`);
        }
    });

    function openChatBox(postId, x, y, messages, noteContent, noteImage) {
        $('.wfn-chat-box').remove();

        let left = Math.min(x + 30, window.innerWidth - 350);
        let top = Math.min(y, window.innerHeight - 480);
        
        left = Math.max(10, left);
        top = Math.max(10, top);

        let title = postId ? 'Revisi #' + postId : 'Revisi Baru';

        let footerHtml = '';
        
        if (!wfn_ajax.is_admin) {
            // Paper Plane Icon for Send
            footerHtml = `
                <div class='wfn-chat-footer'>
                   <div class="wfn-file-input-wrapper">
                        <label for="wfn-file-upload" class="wfn-file-label">
                            <iconify-icon icon="mdi:paperclip" width="20" height="20"></iconify-icon>
                        </label>
                        <input type="file" id="wfn-file-upload" class="wfn-file-input" accept="image/*" style="display:none;">
                    </div>
                    <input type='text' class='wfn-chat-input' placeholder='Tulis pesan...'>
                    <button class='wfn-chat-send'><iconify-icon icon="mdi:send" width="20" height="20"></iconify-icon></button>
                </div>
                 <div id="wfn-file-preview" style="display:none; padding: 5px 10px; font-size: 12px; color: #666; border-top: 1px solid #eee;">
                    <span id="wfn-filename"></span> <span id="wfn-remove-file" style="cursor:pointer; color:red; margin-left:5px;">&times;</span>
                </div>
            `;
        } else {
             footerHtml = `
                <div class='wfn-chat-footer' style='justify-content:center; color:#888; font-size:12px; font-style:italic;'>
                    Mode Lihat Saja (Admin)
                </div>
            `;
        }

        let html = `
            <div class='wfn-chat-box ${wfn_ajax.is_admin ? "wfn-is-admin" : "wfn-is-client"}' data-post-id='${postId || ''}' data-x='${x}' data-y='${y}' style='top:${top}px; left:${left}px'>
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
            appendMessage(box, noteContent, 'Client', false, postId, 'post', noteImage);
        }

        if (messages && messages.length > 0) {
            messages.forEach(m => {
                appendMessage(box, m.content, m.author, m.is_admin, m.id, 'comment', m.image_url);
            });
        }

        if(!postId && !wfn_ajax.is_admin) {
            box.find('.wfn-chat-input').focus();
        }

        // File Input Change Handler
        $('#wfn-file-upload').on('change', function() {
            let file = this.files[0];
            if (file) {
                $('#wfn-filename').text(file.name);
                $('#wfn-file-preview').show();
            }
        });

        // Remove File Handler
        $('#wfn-remove-file').on('click', function() {
            $('#wfn-file-upload').val('');
            $('#wfn-file-preview').hide();
        });
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
                    addPinToScreen(pin.id, pin.meta.x, pin.meta.y, pin.meta.selector, pin.content, pin.replies, pin.image_url);
                });
            } else {
                if (response.data === 'Unauthorized') {
                    localStorage.removeItem('wfn_client_token');
                    userToken = null;
                }
            }
        });
    }

    function addPinToScreen(id, x, y, selector, content, replies, imageUrl) {
        let pin = `<div class='wfn-pin' data-id='${id}' data-selector='${selector || ''}'><span>!</span></div>`;
        let $pin = $(pin);
        let appended = false;

        if (selector && $(selector).length > 0) {
            let el = $(selector);
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
        $pin.data('image-url', imageUrl || null);

        $pin.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            let noteContent = $(this).data('content');
            let noteReplies = $(this).data('replies');
            let noteImage = $(this).data('image-url');
            let rect = this.getBoundingClientRect();
            openChatBox(id, rect.left, rect.top, noteReplies, noteContent, noteImage);
        });
    }
});
