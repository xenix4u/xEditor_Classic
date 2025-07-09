# XEditor 그누보드 통합 가이드

## 개요
XEditor를 그누보드5에 통합하여 사용하는 방법을 설명합니다.

## 이미지 업로드 제한사항

### 1. 파일 크기 제한
- **회원**: 10MB (설정 가능)
- **비회원**: 2MB (설정 가능)
- 서버 `php.ini` 설정도 확인 필요:
  - `upload_max_filesize`
  - `post_max_size`

### 2. 파일 개수 제한
- **기본 제한 없음** - 무한대로 업로드 가능
- 하지만 실제 운영시 제한 권장:
  - 게시글당 이미지 개수 제한
  - 일일 업로드 용량 제한
  - 전체 저장 공간 관리

### 3. 보안 고려사항
```php
// 추가 보안 설정 예시
// 1. 일일 업로드 제한
$daily_limit = 100 * 1024 * 1024; // 100MB
$today_uploaded = get_member_image_size($member['mb_id'], 'today');
if($today_uploaded + $file['size'] > $daily_limit) {
    die(json_encode(['error' => '일일 업로드 한도 초과']));
}

// 2. 게시글당 이미지 개수 제한
$max_images_per_post = 20;
$current_images = get_post_image_count($bo_table, $wr_id);
if($current_images >= $max_images_per_post) {
    die(json_encode(['error' => '게시글당 최대 이미지 개수 초과']));
}

// 3. 이미지 실제 타입 검증
$real_type = exif_imagetype($file['tmp_name']);
$allowed_real_types = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP];
if(!in_array($real_type, $allowed_real_types)) {
    die(json_encode(['error' => '유효하지 않은 이미지 파일']));
}
```

## 설치 방법

### 1. 파일 복사
```bash
# XEditor 파일을 그누보드에 복사
cp dist/xeditor.min.js {그누보드경로}/js/
cp dist/xeditor.min.css {그누보드경로}/css/
cp src/adapters/gnuboard.js {그누보드경로}/js/

# AJAX 업로드 파일 복사
cp examples/gnuboard-ajax-upload.php {그누보드경로}/bbs/ajax.image_upload.php
```

### 2. 스킨 파일 수정
`skin/board/basic/write.skin.php`:
```php
<!-- 기존 에디터 주석 처리 -->
<?php /* if($is_dhtml_editor) { 
    echo $editor_html; 
} */ ?>

<!-- XEditor 추가 -->
<link rel="stylesheet" href="<?php echo G5_JS_URL ?>/xeditor.min.css">
<script src="<?php echo G5_JS_URL ?>/xeditor.min.js"></script>
<script src="<?php echo G5_JS_URL ?>/gnuboard.js"></script>

<script>
// 그누보드 전역 변수 설정
var g5_url = '<?php echo G5_URL ?>';
var g5_bo_table = '<?php echo $bo_table ?>';
var g5_wr_id = '<?php echo $wr_id ?>';
var g5_is_member = <?php echo $is_member ? 'true' : 'false' ?>;
</script>
```

### 3. 업로드 디렉토리 권한 설정
```bash
mkdir -p {그누보드경로}/data/editor
chmod 707 {그누보드경로}/data/editor
```

## 추가 기능 구현

### 1. 임시 저장 기능
```javascript
// 자동 저장 설정
initXEditorForGnuboard('#xeditor-container', {
  autoSave: {
    enabled: true,
    interval: 60000, // 1분마다
    key: 'gnuboard_' + g5_bo_table + '_autosave'
  }
});
```

### 2. 첨부 이미지 관리
```php
// 게시글 작성 완료 후 임시 이미지를 정식 등록
function register_temp_images($bo_table, $wr_id, $mb_id) {
    $sql = "UPDATE g5_board_file_temp 
            SET wr_id = '{$wr_id}',
                bf_temp = 0
            WHERE bo_table = '{$bo_table}'
              AND mb_id = '{$mb_id}'
              AND bf_temp = 1
              AND bf_datetime > DATE_SUB(NOW(), INTERVAL 1 DAY)";
    sql_query($sql);
}

// 오래된 임시 이미지 정리 (크론으로 실행)
function clean_temp_images() {
    $sql = "SELECT * FROM g5_board_file_temp 
            WHERE bf_temp = 1 
              AND bf_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)";
    $result = sql_query($sql);
    
    while($row = sql_fetch_array($result)) {
        $filepath = G5_DATA_PATH.'/editor/'.substr($row['bf_datetime'],0,7).'/'.$row['bf_file'];
        @unlink($filepath);
    }
    
    sql_query("DELETE FROM g5_board_file_temp 
               WHERE bf_temp = 1 
                 AND bf_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)");
}
```

### 3. 이미지 최적화
```javascript
// 이미지 자동 리사이즈 및 압축
initXEditorForGnuboard('#xeditor-container', {
  image: {
    maxSize: 5, // 5MB
    maxWidth: 1200, // 최대 너비
    quality: 0.8, // JPEG 품질
    resizeBeforeUpload: true, // 업로드 전 리사이즈
    
    // 업로드 전 처리
    beforeUpload: function(file) {
      // 파일명 한글 처리
      const ext = file.name.split('.').pop();
      const newName = 'image_' + Date.now() + '.' + ext;
      return new File([file], newName, { type: file.type });
    }
  }
});
```

## 주의사항

1. **서버 용량 관리**: 무제한 업로드 허용시 서버 용량 모니터링 필수
2. **보안**: 이미지 업로드 시 악성 코드 검사 필요
3. **성능**: 대용량 이미지는 썸네일 생성으로 페이지 로딩 최적화
4. **백업**: 정기적인 업로드 이미지 백업 필요

## 문제 해결

### 업로드 실패시 체크사항
1. 디렉토리 권한 확인 (707 또는 777)
2. PHP 설정 확인 (`upload_max_filesize`, `post_max_size`)
3. 웹서버 설정 확인 (nginx의 경우 `client_max_body_size`)
4. 디스크 용량 확인

### 이미지가 표시되지 않을 때
1. 이미지 URL 경로 확인
2. `.htaccess` 또는 nginx 설정에서 이미지 접근 권한 확인
3. 이미지 파일 권한 확인 (644 이상)