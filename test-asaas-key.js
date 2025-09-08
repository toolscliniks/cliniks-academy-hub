import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://kisnmhcncgiwysbrcdkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc25taGNuY2dpd3lzYnJjZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTgyOTUsImV4cCI6MjA2NzQ5NDI5NX0.lGjTRuCPW3O4tKev8gD-o6GiELWYz9ZXElSuv_BpfhE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAsaasKey() {
  try {
    console.log('🔍 Testando chave API do Asaas...');
    
    // Usar a chave API encontrada no banco
    const encryptedKey = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojc3N2JhOTUyLTVlZmItNDk5NS04YWUxLTUzYWJiZjIyMTg5MDo6JGFhY2hfYWYwZTkzZmUtN2U3Ni00MDI4LTg3ZDUtZjQyMzAyMzQzOWJm';
    
    console.log('✅ Chave encontrada no banco');
    console.log('🔑 Formato da chave:', encryptedKey.substring(0, 20) + '...');
    
    // A chave parece estar no formato do Asaas, vamos testá-la diretamente
    let apiKey = encryptedKey;
    
    // Testar a chave com a API do Asaas
    console.log('🌐 Testando conexão com API do Asaas...');
    
    const response = await fetch('https://www.asaas.com/api/v3/customers?limit=1', {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexão com Asaas bem-sucedida!');
      console.log('📊 Dados recebidos:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na API do Asaas:');
      console.error('Status:', response.status);
      console.error('Resposta:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testAsaasKey();