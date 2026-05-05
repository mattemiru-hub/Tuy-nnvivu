import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app": {
        "title": "LUCKYDRAW",
        "subtitle": "PRO ENGINE",
        "purge": "Purge Database",
        "confirm_purge": "Are you sure you want to reset all data?"
      },
      "nav": {
        "dashboard": "Dashboard",
        "programs": "Programs",
        "prizes": "Prizes",
        "participants": "Participants",
        "draw": "Draw",
        "history": "History",
        "settings": "Settings"
      },
      "dashboard": {
        "active_programs": "Active Programs",
        "total_tickets": "Total Tickets",
        "lucky_winners": "Lucky Winners",
        "spotlight": "Current Spotlight",
        "live_now": "LIVE NOW",
        "session_launch": "Session Launch",
        "engine_status": "Engine Status",
        "optimized": "OPTIMIZED & READY",
        "rewards": "Rewards",
        "entries": "Entries",
        "winners": "Winners",
        "library": "Session Library",
        "no_session": "No active session found",
        "ticket_stats": "Ticket Statistics",
        "prize_allocation": "Prize Allocation"
      },
      "common": {
        "tickets": "TICKETS",
        "rewards_caps": "REWARDS",
        "winners_caps": "WINNERS",
        "language": "Language",
        "month": "Month",
        "year": "Year",
        "delete": "Delete",
        "edit": "Edit",
        "save": "Save",
        "cancel": "Cancel",
        "close": "Close",
        "update": "Update"
      },
      "draw": {
        "start": "START ENGINE",
        "stop": "LOCK WINNER",
        "reset": "RESET DRAW",
        "prizes_remaining": "remaining",
        "winners_count": "winners",
        "draw_history": "Draw History",
        "congratulations": "CONGRATULATIONS",
        "winner": "WINNER",
        "program_info": "Program Info",
        "total_prizes": "Total Prizes",
        "won": "Won",
        "error_no_tickets": "No eligible tickets found for this prize."
      },
      "setup": {
        "create_title": "Configure New Session",
        "edit_title": "Modify Session",
        "program_name": "Session Identity",
        "program_desc": "Session Context",
        "create_button": "Launch Session",
        "update_button": "Save Changes",
        "select_button": "Select to Draw",
        "confirm_delete": "Deleting this program will erase all its data. Are you sure?",
        "error_last_program": "Cannot delete the last remaining program."
      },
      "prizes": {
        "rules_title": "Rule Oracle",
        "max_wins_ticket": "Max Wins / Ticket",
        "max_wins_person": "Max Wins / Person",
        "block_duplicates": "Block Type Duplicates",
        "entropy_mode": "Entropy Mode",
        "inventory": "Reward Inventory",
        "add_prize": "Inject New Reward",
        "remaining": "Remaining",
        "edit_image": "Refine Art",
        "new_prize_name": "New Prize Tier",
        "confirm_delete": "Delete this prize tier?",
        "image_url": "Enter Image URL"
      },
      "participants": {
        "management_title": "Participant Roster",
        "search_placeholder": "Search by Name, ID or Dept...",
        "total_count": "Total Participants",
        "no_data": "No participants found in this session.",
        "add_manual": "Manual Entry",
        "edit_member": "Edit Member",
        "confirm_bulk_delete": "Are you sure you want to clear the entire participant list?",
        "clear_all": "Purge Roster"
      },
      "upload": {
        "tab_upload": "Excel Import",
        "tab_list": "Roster View",
        "drop_files": "Drop files here or click to upload",
        "supports": "Supports .xlsx and .csv",
        "mapping": "Column Mapping",
        "select_columns": "Select the correct columns for each field",
        "process": "Process Data",
        "import_mode": "Import Mode",
        "one_file_multi": "One file for multiple programs",
        "one_file_per": "One file per program",
        "split_column": "Split by Column"
      }
    }
  },
  "vi": {
    "translation": {
      "app": {
        "title": "LUCKYDRAW",
        "subtitle": "HỆ THỐNG QUAY SỐ",
        "purge": "Xóa Dữ Liệu",
        "confirm_purge": "Bạn có chắc chắn muốn reset toàn bộ dữ liệu?"
      },
      "nav": {
        "dashboard": "Tổng quan",
        "programs": "Chương trình",
        "prizes": "Giải thưởng",
        "participants": "Danh sách vé",
        "draw": "Quay số",
        "history": "Lịch sử",
        "settings": "Cài đặt"
      },
      "dashboard": {
        "active_programs": "Chương trình đang chạy",
        "total_tickets": "Tổng số phiếu",
        "lucky_winners": "Người trúng giải",
        "spotlight": "Chương trình tiêu điểm",
        "live_now": "ĐANG DIỄN RA",
        "session_launch": "Ngày khởi tạo",
        "engine_status": "Trạng thái hệ thống",
        "optimized": "ĐÃ TỐI ƯU & SẴN SÀNG",
        "rewards": "Giải thưởng",
        "entries": "Vé tham dự",
        "winners": "Người thắng",
        "library": "Thư viện chương trình",
        "no_session": "Không tìm thấy chương trình nào",
        "ticket_stats": "Thống kê vé",
        "prize_allocation": "Phân bổ giải thưởng"
      },
      "common": {
        "tickets": "PHIẾU",
        "rewards_caps": "GIẢI THƯỞNG",
        "winners_caps": "TRÚNG GIẢI",
        "language": "Ngôn ngữ",
        "month": "Tháng",
        "year": "Năm",
        "delete": "Xóa",
        "edit": "Sửa",
        "save": "Lưu",
        "cancel": "Hủy",
        "close": "Đóng",
        "update": "Cập nhật"
      },
      "draw": {
        "start": "BẮT ĐẦU QUAY",
        "stop": "KẾT THÚC",
        "reset": "LÀM MỚI",
        "prizes_remaining": "còn lại",
        "winners_count": "đã trúng",
        "draw_history": "Lịch sử quay số",
        "congratulations": "CHÚC MỪNG",
        "winner": "NGƯỜI TRÚNG GIẢI",
        "program_info": "Thông tin chi tiết",
        "total_prizes": "Tổng số giải",
        "won": "Đã trúng",
        "error_no_tickets": "Không tìm thấy phiếu hợp lệ cho giải này."
      },
      "setup": {
        "create_title": "Cấu hình chương trình mới",
        "edit_title": "Chỉnh sửa chương trình",
        "program_name": "Tên chương trình",
        "program_desc": "Mô tả / Ghi chú",
        "create_button": "Khởi tạo chương trình",
        "update_button": "Lưu thay đổi",
        "select_button": "Chọn để quay số",
        "confirm_delete": "Xóa chương trình sẽ làm mất toàn bộ dữ liệu liên quan. Bạn chắc chứ?",
        "error_last_program": "Không thể xóa chương trình cuối cùng."
      },
      "prizes": {
        "rules_title": "Quy tắc quay số",
        "max_wins_ticket": "Số lần thắng / Phiếu",
        "max_wins_person": "Số lần thắng / Người",
        "block_duplicates": "Chặn trúng trùng loại giải",
        "entropy_mode": "Chế độ ngẫu nhiên tuyệt đối",
        "inventory": "Danh mục giải thưởng",
        "add_prize": "Thêm giải thưởng mới",
        "remaining": "Còn lại",
        "edit_image": "Đổi hình ảnh",
        "new_prize_name": "Giải thưởng mới",
        "confirm_delete": "Xóa hạng mục giải thưởng này?",
        "image_url": "Nhập URL hình ảnh"
      },
      "participants": {
        "management_title": "Quản lý danh sách tham gia",
        "search_placeholder": "Tìm kiếm theo tên, ID, phòng ban...",
        "total_count": "Tổng số người tham gia",
        "no_data": "Chưa có danh sách người tham gia cho chương trình này.",
        "add_manual": "Thêm thủ công",
        "edit_member": "Sửa thông tin",
        "confirm_bulk_delete": "Bạn có chắc chắn muốn xóa toàn bộ danh sách vé?",
        "clear_all": "Xóa trắng danh sách"
      },
      "upload": {
        "tab_upload": "Nhập từ Excel",
        "tab_list": "Xem danh sách",
        "drop_files": "Thả file vào đây hoặc click để tải lên",
        "supports": "Hỗ trợ định dạng .xlsx và .csv",
        "mapping": "Ánh xạ cột dữ liệu",
        "select_columns": "Chọn cột chính xác cho từng trường thông tin",
        "process": "Xử lý & Lưu dữ liệu",
        "import_mode": "Chế độ nhập liệu",
        "one_file_multi": "Một file cho nhiều chương trình",
        "one_file_per": "Mỗi chương trình một file",
        "split_column": "Phân tách theo cột"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
