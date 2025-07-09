<?php
/**
 * 그누보드 이미지 업로드 제한 설정
 * 이 설정들을 적절히 조정하여 무제한 업로드를 방지할 수 있습니다.
 */

// === 기본 제한 설정 ===
define('XEDITOR_MAX_FILE_SIZE', 10 * 1024 * 1024); // 파일당 최대 크기 (10MB)
define('XEDITOR_MAX_FILES_PER_POST', 30); // 게시글당 최대 이미지 수
define('XEDITOR_MAX_DAILY_UPLOAD', 100 * 1024 * 1024); // 일일 업로드 한도 (100MB)
define('XEDITOR_MAX_TOTAL_STORAGE', 1024 * 1024 * 1024); // 회원당 총 저장 용량 (1GB)

// === 회원 등급별 제한 ===
$xeditor_upload_limits = array(
    1 => array( // 일반회원
        'max_file_size' => 5 * 1024 * 1024, // 5MB
        'max_files_per_post' => 10,
        'max_daily_upload' => 50 * 1024 * 1024, // 50MB
        'allowed_types' => array('image/jpeg', 'image/png', 'image/gif')
    ),
    2 => array( // 정회원
        'max_file_size' => 10 * 1024 * 1024, // 10MB
        'max_files_per_post' => 20,
        'max_daily_upload' => 100 * 1024 * 1024, // 100MB
        'allowed_types' => array('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    ),
    3 => array( // 특별회원
        'max_file_size' => 20 * 1024 * 1024, // 20MB
        'max_files_per_post' => 50,
        'max_daily_upload' => 500 * 1024 * 1024, // 500MB
        'allowed_types' => array('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    ),
    10 => array( // 관리자
        'max_file_size' => 50 * 1024 * 1024, // 50MB
        'max_files_per_post' => 100,
        'max_daily_upload' => 0, // 무제한
        'allowed_types' => array('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    )
);

// === 업로드 제한 체크 함수 ===
function check_upload_limits($member, $file, $bo_table = '', $wr_id = 0) {
    global $xeditor_upload_limits;
    
    $mb_level = $member['mb_level'] ? $member['mb_level'] : 1;
    $limits = isset($xeditor_upload_limits[$mb_level]) ? $xeditor_upload_limits[$mb_level] : $xeditor_upload_limits[1];
    
    // 1. 파일 크기 체크
    if($file['size'] > $limits['max_file_size']) {
        return array('error' => '파일 크기가 제한을 초과했습니다. (최대: '.get_filesize($limits['max_file_size']).')');
    }
    
    // 2. 파일 타입 체크
    if(!in_array($file['type'], $limits['allowed_types'])) {
        return array('error' => '허용되지 않는 파일 형식입니다.');
    }
    
    // 3. 일일 업로드 한도 체크
    if($limits['max_daily_upload'] > 0) {
        $today_size = get_member_upload_size($member['mb_id'], 'today');
        if($today_size + $file['size'] > $limits['max_daily_upload']) {
            return array('error' => '일일 업로드 한도를 초과했습니다.');
        }
    }
    
    // 4. 게시글당 파일 수 체크
    if($bo_table && $wr_id) {
        $file_count = get_post_file_count($bo_table, $wr_id);
        if($file_count >= $limits['max_files_per_post']) {
            return array('error' => '게시글당 최대 이미지 수를 초과했습니다. (최대: '.$limits['max_files_per_post'].'개)');
        }
    }
    
    // 5. 총 저장 용량 체크
    $total_size = get_member_total_upload_size($member['mb_id']);
    if($total_size + $file['size'] > XEDITOR_MAX_TOTAL_STORAGE) {
        return array('error' => '총 저장 용량을 초과했습니다.');
    }
    
    return array('success' => true);
}

// === 업로드 용량 조회 함수 ===
function get_member_upload_size($mb_id, $period = 'total') {
    $where = "mb_id = '{$mb_id}'";
    
    if($period == 'today') {
        $where .= " AND bf_datetime >= '".date('Y-m-d')." 00:00:00'";
    } elseif($period == 'month') {
        $where .= " AND bf_datetime >= '".date('Y-m-01')." 00:00:00'";
    }
    
    $sql = "SELECT SUM(bf_filesize) as total_size 
            FROM g5_board_file_temp 
            WHERE {$where}";
    $row = sql_fetch($sql);
    
    return $row['total_size'] ? $row['total_size'] : 0;
}

// === 게시글 파일 수 조회 ===
function get_post_file_count($bo_table, $wr_id) {
    $sql = "SELECT COUNT(*) as cnt 
            FROM g5_board_file_temp 
            WHERE bo_table = '{$bo_table}' 
              AND wr_id = '{$wr_id}'";
    $row = sql_fetch($sql);
    
    return $row['cnt'];
}

// === 회원 총 업로드 용량 조회 ===
function get_member_total_upload_size($mb_id) {
    $sql = "SELECT SUM(bf_filesize) as total_size 
            FROM g5_board_file_temp 
            WHERE mb_id = '{$mb_id}'";
    $row = sql_fetch($sql);
    
    return $row['total_size'] ? $row['total_size'] : 0;
}

// === 용량 포맷 함수 ===
function get_filesize($size) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    for ($i = 0; $size > 1024 && $i < 4; $i++) {
        $size /= 1024;
    }
    return round($size, 2).$units[$i];
}

// === 디스크 공간 체크 ===
function check_disk_space($required_space) {
    $free_space = disk_free_space(G5_DATA_PATH);
    $min_free_space = 100 * 1024 * 1024; // 최소 100MB 여유 공간
    
    if($free_space - $required_space < $min_free_space) {
        return false;
    }
    
    return true;
}

// === 정기 정리 스크립트 (크론탭 등록 권장) ===
function cleanup_old_images() {
    // 30일 이상 된 임시 파일 삭제
    $sql = "SELECT * FROM g5_board_file_temp 
            WHERE bf_temp = 1 
              AND bf_datetime < DATE_SUB(NOW(), INTERVAL 30 DAY)";
    $result = sql_query($sql);
    
    while($row = sql_fetch_array($result)) {
        $year_month = substr($row['bf_datetime'], 0, 7);
        $filepath = G5_DATA_PATH.'/editor/'.str_replace('-', '/', $year_month).'/'.$row['bf_file'];
        
        if(file_exists($filepath)) {
            @unlink($filepath);
        }
    }
    
    // DB에서 레코드 삭제
    sql_query("DELETE FROM g5_board_file_temp 
               WHERE bf_temp = 1 
                 AND bf_datetime < DATE_SUB(NOW(), INTERVAL 30 DAY)");
}
?>