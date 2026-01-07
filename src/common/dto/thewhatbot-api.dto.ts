// DTO for TheWhatBot API request
export interface TheWhatBotAction {
  action: 'set_field_value' | 'send_flow';
  field_name?: string;
  value?: string;
  flow_id?: string;
}

export interface TheWhatBotContactDto {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  actions: TheWhatBotAction[];
}

// DTO for TheWhatBot API response
export interface TheWhatBotResponse {
  success: boolean;
  message?: string;
  data?: any;
}
