<?php
/**
 * 그누보드 이미지 업로드 처리 파일
 * /bbs/ajax.image_upload.php 에 위치
 */

include_once('./_common.php');

// AJAX 요청인지 확인
if(!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] != 'XMLHttpRequest') {
    die(json_encode(['error' => 'Invalid request']));
}

// 로그인 체크 (옵션)
if(!$is_member && $board['bo_upload_level'] > 1) {
    die(json_encode(['error' => '회원만 업로드 가능합니다.']));
}

// 게시판 설정 확인
$bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
$wr_id = isset($_POST['wr_id']) ? (int)$_POST['wr_id'] : 0;

// 파일 체크
if(!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    die(json_encode(['error' => '파일 업로드 실패']));
}

$file = $_FILES['file'];

// 파일 타입 체크
$allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if(!in_array($file['type'], $allowed_types)) {
    die(json_encode(['error' => '허용되지 않는 파일 형식입니다.']));
}

// 파일 크기 체크 (회원 10MB, 비회원 2MB)
$max_size = $is_member ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
if($file['size'] > $max_size) {
    die(json_encode(['error' => '파일 크기가 너무 큽니다.']));
}

// 업로드 디렉토리 설정
$upload_dir = G5_DATA_PATH.'/editor/'.date('Y/m');
$upload_url = G5_DATA_URL.'/editor/'.date('Y/m');

// 디렉토리 생성
if(!is_dir($upload_dir)) {
    @mkdir($upload_dir, G5_DIR_PERMISSION, true);
    @chmod($upload_dir, G5_DIR_PERMISSION);
}

// 파일명 생성
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = md5(uniqid()).'.'.$ext;
$filepath = $upload_dir.'/'.$filename;

// 이미지 리사이즈 (선택사항)
$max_width = 1200;
$image_info = getimagesize($file['tmp_name']);

if($image_info[0] > $max_width) {
    // 이미지 리사이즈 처리
    $thumb = thumbnail($file['tmp_name'], $filepath, $max_width, 0, false, true);
    if(!$thumb) {
        // 리사이즈 실패시 원본 업로드
        if(!move_uploaded_file($file['tmp_name'], $filepath)) {
            die(json_encode(['error' => '파일 저장 실패']));
        }
    }
} else {
    // 원본 업로드
    if(!move_uploaded_file($file['tmp_name'], $filepath)) {
        die(json_encode(['error' => '파일 저장 실패']));
    }
}

// 파일 권한 설정
@chmod($filepath, G5_FILE_PERMISSION);

// 업로드 정보 DB 저장 (선택사항)
if($bo_table && $is_member) {
    $sql = "INSERT INTO g5_board_file_temp 
            SET bo_table = '{$bo_table}',
                wr_id = '{$wr_id}',
                mb_id = '{$member['mb_id']}',
                bf_file = '{$filename}',
                bf_filesize = '{$file['size']}',
                bf_datetime = '".G5_TIME_YMDHIS."'";
    sql_query($sql);
}

// 성공 응답
die(json_encode([
    'success' => true,
    'url' => $upload_url.'/'.$filename,
    'filename' => $filename,
    'size' => $file['size']
]));
?>