# xEditor Classic

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/xenix4u/xEditor_Classic)

강력하고 유연한 한국형 WYSIWYG 에디터

[🌐 공식 사이트](https://xenix.net/xedit_classic/) | [🎮 데모](https://xenix.net/xeditor_demo/) | [📥 다운로드](https://xenix.net/xedit_classic/xeditor-classic-v1.0.0.zip)

## 🎯 소개

xEditor Classic은 한국 웹 환경에 최적화된 WYSIWYG 에디터입니다. 그누보드, 워드프레스, XE 등 다양한 CMS와 쉽게 통합할 수 있으며, 직관적인 인터페이스와 풍부한 기능을 제공합니다.

## ✨ 주요 기능

- ✏️ **풍부한 편집 기능**: 글꼴, 크기, 색상, 정렬, 들여쓰기/내어쓰기 등
- 🖼️ **미디어 지원**: 이미지 업로드, 드래그&드롭, 크기 조절, 동영상 삽입
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- 🚀 **빠른 성능**: 최적화된 코드로 빠른 로딩과 부드러운 편집
- 🛡️ **보안 강화**: XSS 방지 및 안전한 HTML 처리
- 🔧 **쉬운 통합**: 단 몇 줄의 코드로 설치 가능
- 🌏 **한국어 최적화**: 한글 입력 및 한국형 UI/UX 완벽 지원

## 🚀 빠른 시작

### 1. 다운로드 설치

```bash
# ZIP 파일 다운로드
wget https://xenix.net/xedit_classic/xeditor-classic-v1.0.0.zip

# 압축 해제
unzip xeditor-classic-v1.0.0.zip
```

### 2. HTML에 포함

```html
<!-- CSS -->
<link rel="stylesheet" href="path/to/xeditor.min.css">

<!-- JavaScript -->
<script src="path/to/xeditor.min.js"></script>
```

### 3. 에디터 초기화

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

### 4. CDN으로 사용하기

다운로드 없이 CDN을 통해 바로 사용할 수 있습니다:

```html
<!-- CSS -->
<link rel="stylesheet" href="https://xenix.net/xedit_classic/xeditor.min.css">

<!-- JavaScript -->
<script src="https://xenix.net/xedit_classic/xeditor.min.js"></script>
```

## 📖 사용법

### 기본 사용법

```javascript
// 에디터 생성
const editor = new xEditor({
    container: '#editor',
    height: '400px'
});

// 콘텐츠 가져오기
const content = editor.getContent();

// 콘텐츠 설정하기
editor.setContent('<p>Hello World!</p>');

// 플레인 텍스트 가져오기
const text = editor.getPlainText();

// 에디터 포커스
editor.focus();

// 에디터 제거
editor.destroy();
```

### 이벤트 처리

```javascript
// 에디터 준비 완료
editor.on('ready', () => {
    console.log('에디터가 준비되었습니다!');
});

// 내용 변경
editor.on('change', () => {
    console.log('내용이 변경되었습니다.');
});

// 포커스 이벤트
editor.on('focus', () => {
    console.log('에디터에 포커스됨');
});

// 블러 이벤트
editor.on('blur', () => {
    console.log('에디터에서 포커스 해제됨');
});
```

### 고급 설정

```javascript
const editor = new xEditor({
    container: '#editor',
    height: '500px',
    width: '100%',
    language: 'ko',
    placeholder: '내용을 입력하세요...',
    theme: 'light', // 'light' 또는 'dark'
    autoSave: {
        enabled: true,
        interval: 30000 // 30초마다 자동 저장
    },
    toolbar: {
        position: 'top', // 'top', 'bottom', 'floating'
        sticky: true,
        items: [
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'fontFamily', 'fontSize', '|',
            'textColor', 'backgroundColor', '|',
            'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
            'orderedList', 'unorderedList', 'checklist', '|',
            'indent', 'outdent', '|',
            'heading', 'paragraph', 'blockquote', '|',
            'link', 'image', 'table', 'code', 'horizontalRule', '|',
            'undo', 'redo', '|',
            'fullscreen'
        ]
    },
    upload: {
        url: '/api/upload',
        maxSize: 5 * 1024 * 1024, // 5MB
        acceptedTypes: ['image/jpeg', 'image/png', 'image/gif']
    }
});
```

## 🔧 CMS 통합 가이드

### 그누보드 5

1. xEditor 파일을 `/plugin/editor/xeditor/` 디렉토리에 업로드
2. `/plugin/editor/xeditor/config.php` 파일 생성:

```php
<?php
if (!defined('_GNUBOARD_')) exit;

function editor_html($id, $content, $is_dhtml_editor=true)
{
    global $g5, $config, $board;
    
    $editor_url = G5_PLUGIN_URL.'/editor/xeditor';
    
    $html = "";
    $html .= "<link rel=\"stylesheet\" href=\"{$editor_url}/xeditor.min.css\">\n";
    $html .= "<script src=\"{$editor_url}/xeditor.min.js\"></script>\n";
    $html .= "<div id=\"{$id}_editor\">{$content}</div>\n";
    $html .= "<textarea id=\"{$id}\" name=\"{$id}\" style=\"display:none;\">{$content}</textarea>\n";
    $html .= "<script>\n";
    $html .= "var {$id}_editor = new xEditor({\n";
    $html .= "    container: '#{$id}_editor',\n";
    $html .= "    height: '350px'\n";
    $html .= "});\n";
    $html .= "\n";
    $html .= "$(document).on('submit', 'form', function() {\n";
    $html .= "    $('#{$id}').val({$id}_editor.getContent());\n";
    $html .= "});\n";
    $html .= "</script>\n";
    
    return $html;
}
?>
```

3. 관리자 페이지에서 에디터를 'xeditor'로 변경

### 워드프레스

1. `/wp-content/plugins/xeditor-classic/` 디렉토리 생성
2. 플러그인 파일 생성 (`xeditor-classic.php`):

```php
<?php
/**
 * Plugin Name: xEditor Classic
 * Description: 강력한 한국형 WYSIWYG 에디터
 * Version: 1.0.0
 * Author: xenixstudio
 * License: MIT
 */

// 에디터 스크립트 등록
add_action('admin_enqueue_scripts', 'xeditor_enqueue_scripts');
function xeditor_enqueue_scripts($hook) {
    if ($hook == 'post.php' || $hook == 'post-new.php') {
        wp_enqueue_style('xeditor-css', plugin_dir_url(__FILE__) . 'xeditor.min.css');
        wp_enqueue_script('xeditor-js', plugin_dir_url(__FILE__) . 'xeditor.min.js', array(), '1.0.0', true);
        wp_enqueue_script('xeditor-init', plugin_dir_url(__FILE__) . 'init.js', array('xeditor-js'), '1.0.0', true);
    }
}

// TinyMCE 대체
add_filter('user_can_richedit', '__return_false');
?>
```

3. 워드프레스 관리자에서 플러그인 활성화

### XE/라이믹스

1. `/modules/editor/skins/xeditor/` 디렉토리에 파일 업로드
2. `skin.xml` 파일 생성:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<skin version="0.2">
    <title xml:lang="ko">xEditor Classic</title>
    <description xml:lang="ko">강력한 한국형 WYSIWYG 에디터</description>
    <version>1.0.0</version>
    <date>2025-01-10</date>
    <author email="x@xenix.net" link="https://xenix.net">
        <name xml:lang="ko">xenixstudio</name>
    </author>
</skin>
```

3. 관리자 페이지에서 에디터 스킨을 'xEditor Classic'으로 변경

## 📚 API 레퍼런스

### 메서드

| 메서드 | 설명 | 반환값 |
|--------|------|--------|
| `getContent()` | HTML 콘텐츠 반환 | String |
| `setContent(html)` | HTML 콘텐츠 설정 | void |
| `getPlainText()` | 플레인 텍스트 반환 | String |
| `focus()` | 에디터에 포커스 | void |
| `blur()` | 에디터 포커스 해제 | void |
| `destroy()` | 에디터 제거 | void |
| `on(event, callback)` | 이벤트 리스너 등록 | void |
| `off(event, callback)` | 이벤트 리스너 제거 | void |
| `execCommand(command, value)` | 명령 실행 | void |

### 이벤트

| 이벤트 | 설명 | 파라미터 |
|--------|------|----------|
| `ready` | 에디터 준비 완료 | - |
| `change` | 콘텐츠 변경 | content |
| `focus` | 포커스 획득 | - |
| `blur` | 포커스 해제 | - |
| `keydown` | 키 다운 | event |
| `keyup` | 키 업 | event |
| `paste` | 붙여넣기 | event |

### 툴바 아이템

| 아이템 | 설명 | 아이콘 |
|--------|------|--------|
| `bold` | 굵게 | **B** |
| `italic` | 기울임 | *I* |
| `underline` | 밑줄 | <u>U</u> |
| `strikethrough` | 취소선 | ~~S~~ |
| `fontFamily` | 글꼴 | Aa |
| `fontSize` | 글자 크기 | T↕ |
| `textColor` | 글자색 | A |
| `backgroundColor` | 배경색 | 🎨 |
| `alignLeft` | 왼쪽 정렬 | ≡ |
| `alignCenter` | 가운데 정렬 | ≡ |
| `alignRight` | 오른쪽 정렬 | ≡ |
| `alignJustify` | 양쪽 정렬 | ≡ |
| `orderedList` | 번호 목록 | 1. |
| `unorderedList` | 글머리 목록 | • |
| `checklist` | 체크리스트 | ☑ |
| `indent` | 들여쓰기 | → |
| `outdent` | 내어쓰기 | ← |
| `heading` | 제목 | H |
| `paragraph` | 단락 | ¶ |
| `blockquote` | 인용문 | " |
| `link` | 링크 | 🔗 |
| `image` | 이미지 | 🖼 |
| `table` | 표 | ⊞ |
| `code` | 코드 | <> |
| `horizontalRule` | 구분선 | — |
| `undo` | 실행취소 | ↶ |
| `redo` | 다시실행 | ↷ |
| `fullscreen` | 전체화면 | ⛶ |

## 🌐 브라우저 지원

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)
- Internet Explorer 11+

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 💬 지원

- 🌐 웹사이트: [https://xenix.net/xedit_classic](https://xenix.net/xedit_classic)
- 📧 이메일: [x@xenix.net](mailto:x@xenix.net)
- 💬 이슈: [GitHub Issues](https://github.com/xenix4u/xEditor_Classic/issues)

---

© 2025 **xenix**studio. All rights reserved.