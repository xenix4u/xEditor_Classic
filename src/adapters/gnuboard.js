/**
 * XEditor 그누보드 어댑터
 * 그누보드5와 통합하여 사용할 수 있는 어댑터입니다.
 */

(function() {
  'use strict';

  // 그누보드 이미지 업로드 설정
  const gnuboardImageConfig = {
    // 파일 크기 제한 (MB)
    maxSize: g5_is_member ? 10 : 2, // 회원 10MB, 비회원 2MB
    
    // 이미지 최대 너비
    maxWidth: 1200,
    
    // 이미지 품질
    quality: 0.85,
    
    // 허용 파일 타입
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // 업로드 함수
    upload: async function(file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bo_table', g5_bo_table || '');
      formData.append('wr_id', g5_wr_id || '');
      
      try {
        const response = await fetch(g5_url + '/bbs/ajax.image_upload.php', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        return result.url;
      } catch (error) {
        console.error('Image upload error:', error);
        throw error;
      }
    },
    
    // 에러 핸들러
    onError: function(error) {
      alert('이미지 업로드 실패: ' + error.message);
    }
  };

  // XEditor를 그누보드 에디터로 초기화
  window.initXEditorForGnuboard = function(selector, options) {
    const defaultOptions = {
      height: 400,
      language: 'ko',
      placeholder: '내용을 입력하세요...',
      image: gnuboardImageConfig,
      toolbar: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'heading', 'paragraph', '|',
        'orderedList', 'unorderedList', '|',
        'link', 'image', 'code', 'blockquote', '|',
        'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
        'indent', 'outdent', '|',
        'undo', 'redo'
      ],
      // 그누보드 폼 제출 시 HTML 가져오기
      onReady: function() {
        const form = document.querySelector('#fwrite, #fcomment');
        if (form) {
          form.addEventListener('submit', function(e) {
            const textarea = document.querySelector(selector);
            if (textarea && window.xeditorInstance) {
              textarea.value = window.xeditorInstance.getContent();
            }
          });
        }
      }
    };
    
    // 사용자 옵션과 병합
    const mergedOptions = Object.assign({}, defaultOptions, options);
    
    // XEditor 인스턴스 생성
    window.xeditorInstance = new XEditor(Object.assign({
      container: selector
    }, mergedOptions));
    
    return window.xeditorInstance;
  };

  // 자동 초기화 (DOMContentLoaded)
  document.addEventListener('DOMContentLoaded', function() {
    // 글쓰기 폼의 textarea를 찾아서 자동으로 에디터로 변환
    const writeTextarea = document.querySelector('#wr_content');
    if (writeTextarea && typeof XEditor !== 'undefined') {
      // 기존 에디터 숨기기
      const existingEditor = document.querySelector('.cke_wrapper, .smarteditor2');
      if (existingEditor) {
        existingEditor.style.display = 'none';
      }
      
      // textarea 숨기기
      writeTextarea.style.display = 'none';
      
      // 에디터 컨테이너 생성
      const editorContainer = document.createElement('div');
      editorContainer.id = 'xeditor-container';
      writeTextarea.parentNode.insertBefore(editorContainer, writeTextarea.nextSibling);
      
      // XEditor 초기화
      initXEditorForGnuboard('#xeditor-container', {
        // 기존 내용 로드
        onReady: function() {
          if (writeTextarea.value) {
            window.xeditorInstance.setContent(writeTextarea.value);
          }
        }
      });
    }
  });

})();