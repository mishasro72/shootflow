
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "actor_type": Database["public"]['Enums']["actor_type"],"created_at": string,"id": string,"payload": NonNullable<Json>,"project_id": string,"type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_type": Database["public"]['Enums']["actor_type"],"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"project_id": string,"type": string,"workspace_id": string
                  }
                  Update: {
                    "actor_type"?: Database["public"]['Enums']["actor_type"],"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"project_id"?: string,"type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"board_item_gear": {
                  Row: {
                    "board_item_id": string,"created_at": string,"gear_id": string,"project_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_item_id": string,"created_at"?: string,"gear_id": string,"project_id": string,"workspace_id": string
                  }
                  Update: {
                    "board_item_id"?: string,"created_at"?: string,"gear_id"?: string,"project_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_item_gear_board_item_id_fkey"
      columns: ["board_item_id"]
isOneToOne: false
      referencedRelation: "board_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_item_gear_gear_id_fkey"
      columns: ["gear_id"]
isOneToOne: false
      referencedRelation: "gear_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_item_gear_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_item_gear_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"board_items": {
                  Row: {
                    "body": string | null,"created_at": string,"deleted_at": string | null,"group_color": string | null,"group_role": Database["public"]['Enums']["board_group_role"] | null,"height": number | null,"id": string,"image_key": string | null,"in_shot_list": boolean,"kind": Database["public"]['Enums']["board_item_kind"],"parent_id": string | null,"payload": NonNullable<Json>,"project_id": string,"sort_order": number,"status": Database["public"]['Enums']["review_status"] | null,"status_changed_at": string | null,"technique_note": string | null,"thumb_key": string | null,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["board_visibility"],"width": number | null,"workspace_id": string,"x": number,"y": number,"z": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"group_color"?: string | null,"group_role"?: Database["public"]['Enums']["board_group_role"] | null,"height"?: number | null,"id"?: string,"image_key"?: string | null,"in_shot_list"?: boolean,"kind": Database["public"]['Enums']["board_item_kind"],"parent_id"?: string | null,"payload"?: NonNullable<Json>,"project_id": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["review_status"] | null,"status_changed_at"?: string | null,"technique_note"?: string | null,"thumb_key"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"],"width"?: number | null,"workspace_id": string,"x"?: number,"y"?: number,"z"?: number
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"group_color"?: string | null,"group_role"?: Database["public"]['Enums']["board_group_role"] | null,"height"?: number | null,"id"?: string,"image_key"?: string | null,"in_shot_list"?: boolean,"kind"?: Database["public"]['Enums']["board_item_kind"],"parent_id"?: string | null,"payload"?: NonNullable<Json>,"project_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["review_status"] | null,"status_changed_at"?: string | null,"technique_note"?: string | null,"thumb_key"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"],"width"?: number | null,"workspace_id"?: string,"x"?: number,"y"?: number,"z"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_items_image_key_fkey"
      columns: ["image_key"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["object_key"]
    },{
      foreignKeyName: "board_items_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "board_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_items_thumb_key_fkey"
      columns: ["thumb_key"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["object_key"]
    },{
      foreignKeyName: "board_items_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_name": string,"author_type": Database["public"]['Enums']["author_type"],"board_item_id": string | null,"created_at": string,"id": string,"photo_id": string | null,"pin_x": number | null,"pin_y": number | null,"project_id": string,"text": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"author_type": Database["public"]['Enums']["author_type"],"board_item_id"?: string | null,"created_at"?: string,"id"?: string,"photo_id"?: string | null,"pin_x"?: number | null,"pin_y"?: number | null,"project_id": string,"text": string,"workspace_id": string
                  }
                  Update: {
                    "author_name"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"board_item_id"?: string | null,"created_at"?: string,"id"?: string,"photo_id"?: string | null,"pin_x"?: number | null,"pin_y"?: number | null,"project_id"?: string,"text"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_board_item_id_fkey"
      columns: ["board_item_id"]
isOneToOne: false
      referencedRelation: "board_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_photo_id_fkey"
      columns: ["photo_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"extra_retouch_orders": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"project_id": string,"quantity": number,"status": Database["public"]['Enums']["retouch_order_status"],"unit_price_cents": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"project_id": string,"quantity": number,"status"?: Database["public"]['Enums']["retouch_order_status"],"unit_price_cents": number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"project_id"?: string,"quantity"?: number,"status"?: Database["public"]['Enums']["retouch_order_status"],"unit_price_cents"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "extra_retouch_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extra_retouch_orders_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"gear_items": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["gear_kind"],"name": string,"notes": string | null,"sort_order": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["gear_kind"],"name": string,"notes"?: string | null,"sort_order"?: number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["gear_kind"],"name"?: string,"notes"?: string | null,"sort_order"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gear_items_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"link_codes": {
                  Row: {
                    "channel": Database["public"]['Enums']["notification_channel"],"code": string,"created_at": string,"expires_at": string,"project_client_id": string | null,"used_at": string | null,"user_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"code"?: string,"created_at"?: string,"expires_at"?: string,"project_client_id"?: string | null,"used_at"?: string | null,"user_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"code"?: string,"created_at"?: string,"expires_at"?: string,"project_client_id"?: string | null,"used_at"?: string | null,"user_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "link_codes_project_client_id_fkey"
      columns: ["project_client_id"]
isOneToOne: false
      referencedRelation: "project_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_codes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_codes_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"media_files": {
                  Row: {
                    "content_type": string,"created_at": string,"file_name": string,"id": string,"object_key": string,"project_id": string,"purpose": Database["public"]['Enums']["media_purpose"],"size_bytes": number,"status": Database["public"]['Enums']["media_status"],"uploaded_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type": string,"created_at"?: string,"file_name": string,"id"?: string,"object_key"?: string,"project_id": string,"purpose"?: Database["public"]['Enums']["media_purpose"],"size_bytes": number,"status"?: Database["public"]['Enums']["media_status"],"uploaded_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "content_type"?: string,"created_at"?: string,"file_name"?: string,"id"?: string,"object_key"?: string,"project_id"?: string,"purpose"?: Database["public"]['Enums']["media_purpose"],"size_bytes"?: number,"status"?: Database["public"]['Enums']["media_status"],"uploaded_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_files_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_files_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_endpoints": {
                  Row: {
                    "address": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"id": string,"is_enabled": boolean,"project_client_id": string | null,"recipient_type": Database["public"]['Enums']["recipient_type"],"updated_at": string,"user_id": string | null,"verified_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"project_client_id"?: string | null,"recipient_type": Database["public"]['Enums']["recipient_type"],"updated_at"?: string,"user_id"?: string | null,"verified_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "address"?: string,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"project_client_id"?: string | null,"recipient_type"?: Database["public"]['Enums']["recipient_type"],"updated_at"?: string,"user_id"?: string | null,"verified_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_endpoints_project_client_id_fkey"
      columns: ["project_client_id"]
isOneToOne: false
      referencedRelation: "project_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_endpoints_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_endpoints_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"endpoint_id": string,"event_id": string | null,"id": string,"last_error": string | null,"send_after": string,"sent_at": string | null,"status": Database["public"]['Enums']["outbox_status"],"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"endpoint_id": string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["outbox_status"],"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"endpoint_id"?: string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["outbox_status"],"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_endpoint_id_fkey"
      columns: ["endpoint_id"]
isOneToOne: false
      referencedRelation: "notification_endpoints"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_outbox_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "activity_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_outbox_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"photos": {
                  Row: {
                    "bytes": number,"created_at": string,"final_bytes": number | null,"final_key": string | null,"final_preview_key": string | null,"height": number | null,"id": string,"is_selected": boolean,"original_filename": string,"preview_key": string,"project_id": string,"selected_at": string | null,"selection_type": Database["public"]['Enums']["selection_type"] | null,"sort_order": number,"thumb_key": string,"updated_at": string,"width": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes"?: number,"created_at"?: string,"final_bytes"?: number | null,"final_key"?: string | null,"final_preview_key"?: string | null,"height"?: number | null,"id"?: string,"is_selected"?: boolean,"original_filename": string,"preview_key": string,"project_id": string,"selected_at"?: string | null,"selection_type"?: Database["public"]['Enums']["selection_type"] | null,"sort_order"?: number,"thumb_key": string,"updated_at"?: string,"width"?: number | null,"workspace_id": string
                  }
                  Update: {
                    "bytes"?: number,"created_at"?: string,"final_bytes"?: number | null,"final_key"?: string | null,"final_preview_key"?: string | null,"height"?: number | null,"id"?: string,"is_selected"?: boolean,"original_filename"?: string,"preview_key"?: string,"project_id"?: string,"selected_at"?: string | null,"selection_type"?: Database["public"]['Enums']["selection_type"] | null,"sort_order"?: number,"thumb_key"?: string,"updated_at"?: string,"width"?: number | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "photos_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"max_active_projects": number,"max_photos_per_project": number,"max_storage_bytes": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"max_active_projects": number,"max_photos_per_project": number,"max_storage_bytes": number,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"max_active_projects"?: number,"max_photos_per_project"?: number,"max_storage_bytes"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"locale": string,"name": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"locale"?: string,"name"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"locale"?: string,"name"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_clients": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"last_seen_at": string | null,"name": string,"project_id": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_seen_at"?: string | null,"name": string,"project_id": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_seen_at"?: string | null,"name"?: string,"project_id"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_clients_project_id_fkey"
      columns: ["project_id"]
isOneToOne: true
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_clients_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"project_gear": {
                  Row: {
                    "created_at": string,"custom_kind": Database["public"]['Enums']["gear_kind"] | null,"custom_name": string | null,"gear_id": string | null,"id": string,"is_packed": boolean,"project_id": string,"sort_order": number,"source": Database["public"]['Enums']["gear_source"],"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"custom_kind"?: Database["public"]['Enums']["gear_kind"] | null,"custom_name"?: string | null,"gear_id"?: string | null,"id"?: string,"is_packed"?: boolean,"project_id": string,"sort_order"?: number,"source"?: Database["public"]['Enums']["gear_source"],"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"custom_kind"?: Database["public"]['Enums']["gear_kind"] | null,"custom_name"?: string | null,"gear_id"?: string | null,"id"?: string,"is_packed"?: boolean,"project_id"?: string,"sort_order"?: number,"source"?: Database["public"]['Enums']["gear_source"],"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_gear_gear_id_fkey"
      columns: ["gear_id"]
isOneToOne: false
      referencedRelation: "gear_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_gear_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_gear_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "access_token": string,"archived_at": string | null,"client_locale": string,"completed_at": string | null,"created_at": string,"delivered_at": string | null,"extra_retouch_enabled": boolean,"google_place_id": string | null,"id": string,"location_address": string | null,"location_lat": number | null,"location_lng": number | null,"location_map_url": string | null,"location_name": string | null,"notes": string | null,"pin_failed_attempts": number,"pin_hash": string | null,"pin_locked_until": string | null,"place_synced_at": string | null,"reminder_24h_sent_at": string | null,"retouch_limit": number,"selection_submitted_at": string | null,"shoot_end": string | null,"shoot_start": string | null,"status": Database["public"]['Enums']["project_status"],"timezone": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token"?: string,"archived_at"?: string | null,"client_locale"?: string,"completed_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"extra_retouch_enabled"?: boolean,"google_place_id"?: string | null,"id"?: string,"location_address"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"location_map_url"?: string | null,"location_name"?: string | null,"notes"?: string | null,"pin_failed_attempts"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"place_synced_at"?: string | null,"reminder_24h_sent_at"?: string | null,"retouch_limit"?: number,"selection_submitted_at"?: string | null,"shoot_end"?: string | null,"shoot_start"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"timezone"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "access_token"?: string,"archived_at"?: string | null,"client_locale"?: string,"completed_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"extra_retouch_enabled"?: boolean,"google_place_id"?: string | null,"id"?: string,"location_address"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"location_map_url"?: string | null,"location_name"?: string | null,"notes"?: string | null,"pin_failed_attempts"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"place_synced_at"?: string | null,"reminder_24h_sent_at"?: string | null,"retouch_limit"?: number,"selection_submitted_at"?: string | null,"shoot_end"?: string | null,"shoot_start"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"timezone"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"shot_list_item_gear": {
                  Row: {
                    "gear_id": string,"project_id": string,"shot_list_item_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "gear_id": string,"project_id": string,"shot_list_item_id": string,"workspace_id": string
                  }
                  Update: {
                    "gear_id"?: string,"project_id"?: string,"shot_list_item_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shot_list_item_gear_gear_id_fkey"
      columns: ["gear_id"]
isOneToOne: false
      referencedRelation: "gear_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_item_gear_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_item_gear_shot_list_item_id_fkey"
      columns: ["shot_list_item_id"]
isOneToOne: false
      referencedRelation: "shot_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_item_gear_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"shot_list_items": {
                  Row: {
                    "board_item_id": string | null,"collage_keys": (string)[],"created_at": string,"description": string | null,"id": string,"project_id": string,"reference_image_key": string | null,"reject_reason": string | null,"shot_status": Database["public"]['Enums']["shot_status"],"sort_order": number,"status_changed_at": string | null,"technique_note": string | null,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["board_visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_item_id"?: string | null,"collage_keys"?: (string)[],"created_at"?: string,"description"?: string | null,"id"?: string,"project_id": string,"reference_image_key"?: string | null,"reject_reason"?: string | null,"shot_status"?: Database["public"]['Enums']["shot_status"],"sort_order"?: number,"status_changed_at"?: string | null,"technique_note"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"],"workspace_id": string
                  }
                  Update: {
                    "board_item_id"?: string | null,"collage_keys"?: (string)[],"created_at"?: string,"description"?: string | null,"id"?: string,"project_id"?: string,"reference_image_key"?: string | null,"reject_reason"?: string | null,"shot_status"?: Database["public"]['Enums']["shot_status"],"sort_order"?: number,"status_changed_at"?: string | null,"technique_note"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shot_list_items_board_item_id_fkey"
      columns: ["board_item_id"]
isOneToOne: false
      referencedRelation: "board_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_items_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"storage_deletions": {
                  Row: {
                    "attempts": number,"object_key": string,"queued_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"object_key": string,"queued_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"object_key"?: string,"queued_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "brand_name": string | null,"calendar_feed_token": string,"created_at": string,"default_locale": string,"default_retouch_limit": number,"id": string,"name": string,"plan_id": string,"storage_used_bytes": number,"updated_at": string,"watermark_logo_key": string | null,"watermark_text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_name"?: string | null,"calendar_feed_token"?: string,"created_at"?: string,"default_locale"?: string,"default_retouch_limit"?: number,"id"?: string,"name": string,"plan_id": string,"storage_used_bytes"?: number,"updated_at"?: string,"watermark_logo_key"?: string | null,"watermark_text"?: string | null
                  }
                  Update: {
                    "brand_name"?: string | null,"calendar_feed_token"?: string,"created_at"?: string,"default_locale"?: string,"default_retouch_limit"?: number,"id"?: string,"name"?: string,"plan_id"?: string,"storage_used_bytes"?: number,"updated_at"?: string,"watermark_logo_key"?: string | null,"watermark_text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "transition_project_status":
{ Args: { "p_actor"?: Database["public"]['Enums']["actor_type"],"p_project_id": string,"p_to": Database["public"]['Enums']["project_status"] }; Returns: {
              "access_token": string,
"archived_at": string | null,
"client_locale": string,
"completed_at": string | null,
"created_at": string,
"delivered_at": string | null,
"extra_retouch_enabled": boolean,
"google_place_id": string | null,
"id": string,
"location_address": string | null,
"location_lat": number | null,
"location_lng": number | null,
"location_map_url": string | null,
"location_name": string | null,
"notes": string | null,
"pin_failed_attempts": number,
"pin_hash": string | null,
"pin_locked_until": string | null,
"place_synced_at": string | null,
"reminder_24h_sent_at": string | null,
"retouch_limit": number,
"selection_submitted_at": string | null,
"shoot_end": string | null,
"shoot_start": string | null,
"status": Database["public"]['Enums']["project_status"],
"timezone": string,
"title": string,
"updated_at": string,
"workspace_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "projects"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "actor_type": "PHOTOGRAPHER"|"CLIENT"|"SYSTEM","author_type": "PHOTOGRAPHER"|"CLIENT","board_group_role": "LOOK"|"SECTION","board_item_kind": "GROUP"|"IMAGE"|"PALETTE"|"NOTE"|"LINK"|"LOCATION","board_visibility": "EVERYONE"|"TEAM"|"PRIVATE","gear_kind": "LENS"|"CAMERA"|"LIGHT"|"MODIFIER"|"OTHER","gear_source": "AUTO"|"MANUAL","media_purpose": "FILE"|"BOARD","media_status": "PENDING"|"READY","notification_channel": "TELEGRAM"|"EMAIL","outbox_status": "PENDING"|"SENT"|"FAILED"|"SKIPPED","project_status": "DRAFT"|"PLANNING"|"SHOOT_DAY"|"PROOFING"|"SELECTION_SUBMITTED"|"RETOUCHING"|"DELIVERED"|"COMPLETED","recipient_type": "PHOTOGRAPHER"|"CLIENT","retouch_order_status": "PENDING"|"PAID"|"CANCELLED","review_status": "PENDING"|"APPROVED"|"CHANGES_REQUESTED","selection_type": "INCLUDED"|"EXTRA","shot_status": "PENDING"|"SHOT"|"REJECTED","workspace_role": "OWNER"|"ASSISTANT"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "actor_type": ["PHOTOGRAPHER", "CLIENT", "SYSTEM"],"author_type": ["PHOTOGRAPHER", "CLIENT"],"board_group_role": ["LOOK", "SECTION"],"board_item_kind": ["GROUP", "IMAGE", "PALETTE", "NOTE", "LINK", "LOCATION"],"board_visibility": ["EVERYONE", "TEAM", "PRIVATE"],"gear_kind": ["LENS", "CAMERA", "LIGHT", "MODIFIER", "OTHER"],"gear_source": ["AUTO", "MANUAL"],"media_purpose": ["FILE", "BOARD"],"media_status": ["PENDING", "READY"],"notification_channel": ["TELEGRAM", "EMAIL"],"outbox_status": ["PENDING", "SENT", "FAILED", "SKIPPED"],"project_status": ["DRAFT", "PLANNING", "SHOOT_DAY", "PROOFING", "SELECTION_SUBMITTED", "RETOUCHING", "DELIVERED", "COMPLETED"],"recipient_type": ["PHOTOGRAPHER", "CLIENT"],"retouch_order_status": ["PENDING", "PAID", "CANCELLED"],"review_status": ["PENDING", "APPROVED", "CHANGES_REQUESTED"],"selection_type": ["INCLUDED", "EXTRA"],"shot_status": ["PENDING", "SHOT", "REJECTED"],"workspace_role": ["OWNER", "ASSISTANT"]
          }
        }
} as const
