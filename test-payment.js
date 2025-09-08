// Teste simples para verificar a função create-payment
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kisnmhcncgiwysbrcdkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc25taGNuY2dpd3lzYnJjZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTgyOTUsImV4cCI6MjA2NzQ5NDI5NX0.lGjTRuCPW3O4tKev8gD-o6GiELWYz9ZXElSuv_BpfhE';
// Vou usar a chave anon mas simular um usuário autenticado
const mockUserId = 'test-user-id';
const mockUserEmail = 'gilemaeda2@gmail.com';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPayment() {
  try {
    console.log('Testando função create-payment...');
    
    // Fazer requisição HTTP direta para capturar a resposta completa
    const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'apikey': supabaseAnonKey
       },
      body: JSON.stringify({
        planId: '988ffbb7-9431-4840-b6c1-14015de7ee19', // Plano Promocional
        billingType: 'PIX',
        _testUser: {
          id: '469b346e-85f7-4034-ab3f-75d5599a977d',
          email: 'gilejob@gmail.com',
          user_metadata: {
            full_name: 'Usuário Teste'
          }
        }
      })
    });
    
    const responseText = await response.text();
    console.log('Status da resposta:', response.status);
    console.log('Corpo da resposta:', responseText);
    
    if (!response.ok) {
      console.error('Erro na função - Status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error('Dados do erro:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('Resposta não é JSON válido:', responseText);
      }
    } else {
      try {
        const successData = JSON.parse(responseText);
        console.log('Sucesso:', successData);
      } catch (e) {
        console.log('Resposta de sucesso (texto):', responseText);
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testPayment();