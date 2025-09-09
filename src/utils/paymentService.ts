import { supabase } from '@/integrations/supabase/client';
import { UnifiedPayload } from '@/types/schemas';
import { v4 as uuidv4 } from 'uuid';

interface PaymentServiceOptions {
  courseId?: string;
  planId?: string;
  userData: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
}

export class PaymentService {
  /**
   * Cria um payload unificado para envio ao n8n
   */
  private static createPayload(
    type: 'course_purchase' | 'plan_purchase' | 'user_signup',
    options: PaymentServiceOptions,
    itemData: any
  ): UnifiedPayload {
    return {
      type,
      request_id: uuidv4(),
      timestamp: new Date().toISOString(),
      user: {
        id: options.userData.id,
        name: options.userData.name,
        email: options.userData.email,
        cpf: options.userData.cpf,
        phone: options.userData.phone
      },
      item: {
        kind: type === 'course_purchase' ? 'course' : 'plan',
        id: itemData.id,
        name: itemData.title || itemData.name,
        price_cents: Math.round((itemData.price || 0) * 100),
        currency: 'BRL',
        ...(type === 'plan_purchase' && {
          interval: 'monthly', // ou 'annual' baseado no plano
          included_courses: itemData.courses || []
        })
      },
      meta: {
        source: 'web',
        ip: window.location.hostname,
        user_agent: navigator.userAgent
      }
    };
  }

  /**
   * Processa uma compra de curso
   */
  static async purchaseCourse(options: PaymentServiceOptions): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      if (!options.courseId) {
        throw new Error('Course ID is required');
      }

      // Buscar dados do curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, price')
        .eq('id', options.courseId)
        .single();

      if (courseError || !courseData) {
        throw new Error('Course not found');
      }

      // Criar payload unificado
      const payload = this.createPayload('course_purchase', options, courseData);

      // Enviar para a edge function unificada
      const { data, error } = await supabase.functions.invoke('payments-n8n-proxy', {
        body: payload
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Compra processada com sucesso! Você receberá instruções de pagamento por email.',
        data: data
      };

    } catch (error: any) {
      console.error('Error in purchaseCourse:', error);
      
      return {
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Processa uma compra de plano
   */
  static async purchasePlan(options: PaymentServiceOptions): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      if (!options.planId) {
        throw new Error('Plan ID is required');
      }

      // Buscar dados do plano
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select(`
          id, 
          name, 
          price_monthly,
          plan_courses(
            courses(id, title)
          )
        `)
        .eq('id', options.planId)
        .single();

      if (planError || !planData) {
        throw new Error('Plan not found');
      }

      // Preparar dados do plano
      const planWithCourses = {
        ...planData,
        title: planData.name,
        price: planData.price_monthly,
        courses: planData.plan_courses?.map((pc: any) => ({
          course_id: pc.courses.id,
          title: pc.courses.title
        })) || []
      };

      // Criar payload unificado
      const payload = this.createPayload('plan_purchase', options, planWithCourses);

      // Enviar para a edge function unificada
      const { data, error } = await supabase.functions.invoke('payments-n8n-proxy', {
        body: payload
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Assinatura processada com sucesso! Você receberá instruções de pagamento por email.',
        data: data
      };

    } catch (error: any) {
      console.error('Error in purchasePlan:', error);
      
      return {
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Registra um novo usuário
   */
  static async registerUser(userData: PaymentServiceOptions['userData']): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      // Criar payload para cadastro
      const payload = this.createPayload('user_signup', { userData }, {
        id: 'signup',
        title: 'Cadastro de usuário',
        price: 0
      });

      // Enviar para a edge function unificada
      const { data, error } = await supabase.functions.invoke('payments-n8n-proxy', {
        body: payload
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Cadastro processado com sucesso!',
        data: data
      };

    } catch (error: any) {
      console.error('Error in registerUser:', error);
      
      return {
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Verifica se o usuário tem todos os dados obrigatórios
   */
  static validateUserData(userData: Partial<PaymentServiceOptions['userData']>): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields: Array<keyof PaymentServiceOptions['userData']> = [
      'name', 'email', 'cpf', 'phone'
    ];
    
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (!userData[field]?.trim()) {
        switch (field) {
          case 'name': missingFields.push('nome completo'); break;
          case 'email': missingFields.push('email'); break;
          case 'cpf': missingFields.push('CPF'); break;
          case 'phone': missingFields.push('telefone'); break;
        }
      }
    });
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}