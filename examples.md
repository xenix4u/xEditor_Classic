# xEditor Classic 사용 예제

## 🎯 기본 예제

### 1. 심플 에디터
가장 기본적인 에디터 설정입니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>xEditor 기본 예제</title>
    <link rel="stylesheet" href="https://xenix.net/xedit_classic/xeditor.min.css">
</head>
<body>
    <div id="editor"></div>
    
    <script src="https://xenix.net/xedit_classic/xeditor.min.js"></script>
    <script>
        const editor = new xEditor({
            container: '#editor',
            height: '400px',
            placeholder: '내용을 입력하세요...'
        });
    </script>
</body>
</html>
```

### 2. 커스텀 툴바
필요한 기능만 선택하여 툴바를 구성할 수 있습니다.

```javascript
const editor = new xEditor({
    container: '#editor',
    toolbar: {
        items: [
            'bold', 'italic', '|',
            'orderedList', 'unorderedList', '|',
            'link', 'image'
        ]
    }
});
```

## 📝 블로그 에디터

블로그나 게시판에 적합한 설정입니다.

```javascript
const blogEditor = new xEditor({
    container: '#blog-editor',
    height: '500px',
    language: 'ko',
    toolbar: {
        items: [
            'heading', 'paragraph', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'fontFamily', 'fontSize', '|',
            'textColor', 'backgroundColor', '|',
            'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
            'orderedList', 'unorderedList', 'checklist', '|',
            'indent', 'outdent', '|',
            'blockquote', 'code', 'horizontalRule', '|',
            'link', 'image', 'table', '|',
            'undo', 'redo', '|',
            'fullscreen'
        ]
    },
    autoSave: {
        enabled: true,
        interval: 60000, // 1분마다 자동 저장
        key: 'blog-draft'
    }
});

// 자동 저장된 내용 복구
window.addEventListener('load', () => {
    const savedContent = localStorage.getItem('blog-draft');
    if (savedContent) {
        blogEditor.setContent(savedContent);
    }
});
```

## 🏢 기업용 문서 편집기

기업 환경에서 문서 작성에 적합한 설정입니다.

```javascript
const documentEditor = new xEditor({
    container: '#document-editor',
    height: '600px',
    width: '800px',
    theme: 'light',
    toolbar: {
        position: 'top',
        sticky: true,
        items: [
            'heading', 'paragraph', '|',
            'fontFamily', 'fontSize', '|',
            'bold', 'italic', 'underline', '|',
            'textColor', 'backgroundColor', '|',
            'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
            'orderedList', 'unorderedList', '|',
            'indent', 'outdent', '|',
            'table', 'image', 'link', '|',
            'undo', 'redo', '|',
            'print', 'fullscreen'
        ]
    },
    // 이미지 업로드 설정
    upload: {
        url: '/api/upload',
        maxSize: 10 * 1024 * 1024, // 10MB
        acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        headers: {
            'Authorization': 'Bearer ' + userToken
        }
    }
});

// 문서 저장 기능
function saveDocument() {
    const content = documentEditor.getContent();
    const title = document.getElementById('document-title').value;
    
    fetch('/api/documents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userToken
        },
        body: JSON.stringify({
            title: title,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        alert('문서가 저장되었습니다!');
    });
}
```

## 💬 댓글 에디터

댓글 작성에 적합한 미니멀한 설정입니다.

```javascript
const commentEditor = new xEditor({
    container: '#comment-editor',
    height: '150px',
    placeholder: '댓글을 작성하세요...',
    toolbar: {
        items: [
            'bold', 'italic', '|',
            'link', 'image', '|',
            'orderedList', 'unorderedList'
        ]
    }
});

// 댓글 제출
function submitComment() {
    const content = commentEditor.getContent();
    
    if (!content.trim()) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    // API 호출하여 댓글 저장
    fetch('/api/comments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: content,
            postId: currentPostId
        })
    })
    .then(response => response.json())
    .then(data => {
        // 댓글 목록에 추가
        addCommentToList(data);
        // 에디터 초기화
        commentEditor.setContent('');
    });
}
```

## 📧 이메일 편집기

이메일 작성에 최적화된 설정입니다.

```javascript
const emailEditor = new xEditor({
    container: '#email-editor',
    height: '400px',
    toolbar: {
        items: [
            'fontFamily', 'fontSize', '|',
            'bold', 'italic', 'underline', '|',
            'textColor', 'backgroundColor', '|',
            'alignLeft', 'alignCenter', 'alignRight', '|',
            'orderedList', 'unorderedList', '|',
            'link', 'image', '|',
            'undo', 'redo'
        ]
    },
    // 이메일 서명 자동 추가
    onReady: () => {
        const signature = `
            <br><br>
            <div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 10px;">
                <p><strong>${userName}</strong><br>
                ${userTitle}<br>
                ${companyName}<br>
                Tel: ${userPhone}<br>
                Email: ${userEmail}</p>
            </div>
        `;
        emailEditor.setContent(signature);
    }
});

// 이메일 발송
function sendEmail() {
    const to = document.getElementById('email-to').value;
    const subject = document.getElementById('email-subject').value;
    const content = emailEditor.getContent();
    
    fetch('/api/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: to,
            subject: subject,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        alert('이메일이 발송되었습니다!');
    });
}
```

## 🎨 테마 커스터마이징

### 다크 모드
```javascript
const darkEditor = new xEditor({
    container: '#editor',
    theme: 'dark',
    height: '400px'
});

// 동적 테마 변경
function toggleTheme() {
    const currentTheme = darkEditor.getTheme();
    darkEditor.setTheme(currentTheme === 'light' ? 'dark' : 'light');
}
```

### 커스텀 CSS
```css
/* 에디터 커스터마이징 */
.xeditor-wrapper {
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.xeditor-toolbar {
    background: linear-gradient(to right, #667eea, #764ba2);
}

.xeditor-toolbar__item {
    color: white;
}

.xeditor-toolbar__item:hover {
    background-color: rgba(255,255,255,0.2);
}

.xeditor-content {
    font-family: 'Noto Sans KR', sans-serif;
    line-height: 1.8;
}
```

## 🔌 플러그인 개발

### 커스텀 이모지 플러그인
```javascript
class EmojiPlugin {
    name = 'emoji';
    
    init(editor) {
        // 이모지 목록
        const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂'];
        
        // 명령어 등록
        editor.commands.register('insertEmoji', {
            execute: (emoji) => {
                editor.insertContent(emoji);
            }
        });
        
        // 툴바 아이템 추가
        return {
            toolbar: [{
                name: 'emoji',
                icon: '😊',
                tooltip: '이모지 삽입',
                dropdown: emojis.map(emoji => ({
                    text: emoji,
                    command: 'insertEmoji',
                    value: emoji
                }))
            }]
        };
    }
}

// 플러그인 사용
const editor = new xEditor({
    container: '#editor',
    plugins: [new EmojiPlugin()]
});
```

## 🚀 고급 기능

### 실시간 협업 (WebSocket)
```javascript
const collaborativeEditor = new xEditor({
    container: '#collaborative-editor',
    height: '500px'
});

// WebSocket 연결
const ws = new WebSocket('wss://your-server.com/editor');

// 내용 변경 시 서버로 전송
collaborativeEditor.on('change', debounce(() => {
    const content = collaborativeEditor.getContent();
    ws.send(JSON.stringify({
        type: 'content-update',
        content: content,
        userId: currentUserId
    }));
}, 300));

// 서버로부터 업데이트 받기
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'content-update' && data.userId !== currentUserId) {
        // 다른 사용자의 변경사항 적용
        const currentPos = collaborativeEditor.getCursorPosition();
        collaborativeEditor.setContent(data.content);
        collaborativeEditor.setCursorPosition(currentPos);
    }
};
```

### 마크다운 변환
```javascript
// 마크다운을 HTML로 변환하여 에디터에 로드
function loadMarkdown(markdown) {
    // 마크다운 파서 사용 (예: marked.js)
    const html = marked(markdown);
    editor.setContent(html);
}

// 에디터 내용을 마크다운으로 변환
function exportToMarkdown() {
    const html = editor.getContent();
    // HTML to Markdown 변환기 사용 (예: turndown.js)
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(html);
    return markdown;
}
```

### PDF 내보내기
```javascript
function exportToPDF() {
    const content = editor.getContent();
    
    // jsPDF 사용
    const doc = new jsPDF();
    
    // HTML을 PDF로 변환
    doc.html(content, {
        callback: function (doc) {
            doc.save('document.pdf');
        },
        x: 10,
        y: 10
    });
}
```

## 📱 모바일 최적화

```javascript
const mobileEditor = new xEditor({
    container: '#mobile-editor',
    height: '300px',
    // 모바일 디바이스 감지
    toolbar: {
        items: isMobile() ? [
            'bold', 'italic', '|',
            'orderedList', 'unorderedList', '|',
            'link', 'image'
        ] : [
            // 데스크톱용 전체 툴바
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'fontFamily', 'fontSize', '|',
            // ... 더 많은 도구들
        ]
    },
    // 모바일 터치 이벤트 최적화
    mobile: {
        toolbarSticky: false,
        simplifiedUI: true
    }
});

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
```

## 🔗 유용한 링크

- 📖 [공식 문서](https://xenix.net/xedit_classic/)
- 🎮 [온라인 데모](https://xenix.net/xeditor_demo/)
- 💻 [GitHub 저장소](https://github.com/xenix4u/xEditor_Classic)
- 📧 [기술 지원](mailto:x@xenix.net)

---

© 2025 **xenix**studio. All rights reserved.