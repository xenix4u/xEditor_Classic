# xEditor Classic v1.0.0

강력하고 유연한 한국형 WYSIWYG 에디터

## 소개

xEditor Classic은 한국 웹 환경에 최적화된 WYSIWYG 에디터입니다. 그누보드, 워드프레스, XE 등 다양한 CMS와 쉽게 통합할 수 있으며, 직관적인 인터페이스와 풍부한 기능을 제공합니다.

## 주요 기능

- ✏️ **풍부한 편집 기능**: 글꼴, 크기, 색상, 정렬, 들여쓰기/내어쓰기 등
- 🖼️ **미디어 지원**: 이미지 업로드, 드래그&드롭, 크기 조절, 동영상 삽입
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- 🚀 **빠른 성능**: 최적화된 코드로 빠른 로딩과 부드러운 편집
- 🛡️ **보안 강화**: XSS 방지 및 안전한 HTML 처리
- 🔧 **쉬운 통합**: 단 몇 줄의 코드로 설치 가능

## 빠른 시작

### 1. 파일 포함

```html
<!-- CSS -->
<link rel="stylesheet" href="path/to/xeditor.min.css">

<!-- JavaScript -->
<script src="path/to/xeditor.min.js"></script>
```

### 2. 에디터 초기화

```html
<div id="editor"></div>

<script>
const editor = new xEditor({
    container: '#editor',
    height: '400px',
    toolbar: {
        items: [
            'bold', 'italic', 'underline', '|',
            'fontFamily', 'fontSize', '|',
            'orderedList', 'unorderedList', '|',
            'indent', 'outdent', '|',
            'link', 'image', '|',
            'undo', 'redo'
        ]
    }
});
</script>
```

### 3. 콘텐츠 처리

```javascript
// 콘텐츠 가져오기
const content = editor.getContent();

// 콘텐츠 설정하기
editor.setContent('<p>Hello World!</p>');

// 플레인 텍스트 가져오기
const text = editor.getPlainText();
```

## 주요 API

### 메서드

- `getContent()`: HTML 콘텐츠 반환
- `setContent(html)`: HTML 콘텐츠 설정
- `getPlainText()`: 플레인 텍스트 반환
- `focus()`: 에디터에 포커스
- `destroy()`: 에디터 제거

### 이벤트

```javascript
editor.on('ready', () => {
    console.log('에디터 준비 완료');
});

editor.on('change', () => {
    console.log('콘텐츠 변경됨');
});
```

## 설정 옵션

```javascript
{
    container: '#editor',          // 필수: 컨테이너 선택자
    height: '400px',              // 높이
    width: '100%',                // 너비
    language: 'ko',               // 언어
    placeholder: '내용을 입력하세요',
    theme: 'light',               // 'light' 또는 'dark'
    autoSave: {
        enabled: true,
        interval: 30000           // 30초
    },
    toolbar: {
        position: 'top',          // 'top', 'bottom', 'floating'
        sticky: true,
        items: []                 // 툴바 아이템
    }
}
```

## 툴바 아이템

- **텍스트 서식**: bold, italic, underline, strikethrough
- **제목**: heading
- **단락**: paragraph, blockquote
- **정렬**: alignLeft, alignCenter, alignRight, alignJustify
- **리스트**: orderedList, unorderedList, checklist
- **들여쓰기**: indent, outdent
- **링크/미디어**: link, image, video, table
- **기타**: code, horizontalRule, undo, redo, fullscreen

## 브라우저 지원

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)
- Internet Explorer 11+

## 라이선스

MIT License

## 지원

- 웹사이트: https://xenix.net/xedit_classic
- 이메일: x@xenix.net
- GitHub: https://github.com/xenix/xeditor-classic

---

© 2025 **xenix**studio. All rights reserved.