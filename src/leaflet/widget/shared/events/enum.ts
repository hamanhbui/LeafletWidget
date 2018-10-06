export enum EVENT {
    SERVER_UPDATE_CONTEXT_OBJECT = "server_update_context_object",
    SERVER_UPDATE_OBJECT = "server_update_object",
    SERVER_CREATE_OBJECT = "server_create_object",

    SERVER_CREATE_FAILED = "server_create_failed",
    SERVER_DELETE_FAILED = "server_delete_failed",

    STORE_UPDATE_DATA = "store_update_data",
    STORE_SEND_LIST_MARKER_SELECTED = "store_send_list_marker_selected",

    USER_DRAW_SHAPE = "user_draw_shape",
    USER_DELETE_SHAPE = "user_delete_shape",
    USER_EDIT_SHAPE = "user_edit_shape",

    USER_EDIT_POPUP = "user_edit_popup",

    USER_CALL_MICROFLOW = "user_call_microflow",
    USER_OPEN_FORM = "user_open_form",
    USER_REMOVE_FORM = "user_remove_form",
    USER_CLICK_ON_CATEGORY = "user_click_on_category",
    USER_CLICK_ON_SCREENSHOT = "user_click_on_screenshot",

    FOCUS_OBJECT = 'focus_object',

    DESTROY = "destroy",
    UNINITIALIZE_FORM = "uninitialize_form"
}