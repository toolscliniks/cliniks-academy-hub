// Teste da função create-payment
const testPayment = async () => {
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      },
      body: JSON.stringify({
        type: 'course',
        courseId: '1',
        billingType: 'PIX',
        customerName: 'Teste Usuario',
        customerEmail: 'teste@teste.com',
        customerCpfCnpj: '12345678901',
        customerPhone: '11999999999'
      })
    });

    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Erro:', error);
  }
};

testPayment();