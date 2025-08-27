import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'confirmed' | 'pending' | 'failed'>('checking');
  
  const courseId = searchParams.get('courseId');

  useEffect(() => {
    if (courseId && user) {
      checkPaymentAndEnrollment();
    } else if (!user) {
      navigate('/auth');
    } else {
      navigate('/courses');
    }
  }, [courseId, user]);

  const checkPaymentAndEnrollment = async () => {
    try {
      setLoading(true);

      // Get course data
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check if user is enrolled
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollmentError) {
        console.error('Error checking enrollment:', enrollmentError);
      }

      if (enrollmentData) {
        setEnrollment(enrollmentData);
        setPaymentStatus('confirmed');
        toast({
          title: "Pagamento Confirmado!",
          description: "Você já tem acesso ao curso!"
        });
      } else {
        // Check payment status in invoices
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invoiceError) {
          console.error('Error checking invoice:', invoiceError);
        }

        if (invoiceData && invoiceData.status === 'paid') {
          setPaymentStatus('confirmed');
          // Payment confirmed but enrollment might be processing
          setTimeout(() => {
            checkPaymentAndEnrollment();
          }, 3000);
        } else if (invoiceData && invoiceData.status === 'pending') {
          setPaymentStatus('pending');
        } else {
          setPaymentStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    checkPaymentAndEnrollment();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-border/50 max-w-md">
          <CardContent className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Verificando pagamento...</h3>
            <p className="text-muted-foreground">
              Aguarde enquanto confirmamos seu pagamento
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {paymentStatus === 'confirmed' && enrollment ? (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-500">Pagamento Confirmado!</CardTitle>
                <CardDescription>
                  Seu pagamento foi processado com sucesso e você já tem acesso ao curso.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {course && (
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Curso Adquirido:</h4>
                    <div className="flex items-start gap-4">
                      {course.cover_image_url && (
                        <img 
                          src={course.cover_image_url} 
                          alt={course.title}
                          className="w-16 h-20 object-cover rounded"
                        />
                      )}
                      <div>
                        <h5 className="font-medium">{course.title}</h5>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                        <p className="text-sm text-primary mt-1">
                          Instrutor: {course.instructor_name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1"
                  >
                    Ir para o Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="flex-1"
                  >
                    Ver Detalhes do Curso
                  </Button>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>Recibo enviado para: {user?.email}</p>
                </div>
              </CardContent>
            </Card>
          ) : paymentStatus === 'pending' ? (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <CardTitle className="text-2xl text-yellow-500">Pagamento Pendente</CardTitle>
                <CardDescription>
                  Seu pagamento está sendo processado. Isso pode levar alguns minutos.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Assim que o pagamento for confirmado, você receberá acesso imediato ao curso.
                  </p>
                  <Button onClick={handleRetry} variant="outline">
                    Verificar Novamente
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                  >
                    Voltar ao Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle className="text-2xl text-red-500">Problema no Pagamento</CardTitle>
                <CardDescription>
                  Não conseguimos confirmar seu pagamento. Tente novamente ou entre em contato conosco.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Se você realizou o pagamento, pode levar alguns minutos para processar.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={handleRetry} className="flex-1">
                      Tentar Novamente
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/courses/${courseId}`)}
                      className="flex-1"
                    >
                      Voltar ao Curso
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;