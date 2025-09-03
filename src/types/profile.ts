export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  bio: string;
  whatsapp: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  full_name: string;
  bio: string;
  avatar_url: string;
  whatsapp: string;
}
