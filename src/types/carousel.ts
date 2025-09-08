export interface DashboardCarouselItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  media_type: 'image' | 'video';
  action_url: string;
  is_active: boolean;
  order_index: number;
  show_title?: boolean;
  show_description?: boolean;
  content_position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}