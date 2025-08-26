import { Card } from "@/components/ui/card";
import { 
  BookOpen, 
  Users, 
  Award, 
  Clock, 
  Smartphone, 
  TrendingUp,
  Shield,
  Globe
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Cursos Especializados",
    description: "Conteúdo criado por especialistas da indústria com foco prático e aplicável."
  },
  {
    icon: Users,
    title: "Comunidade Ativa",
    description: "Conecte-se com outros profissionais e tire dúvidas em nossa comunidade exclusiva."
  },
  {
    icon: Award,
    title: "Certificações",
    description: "Receba certificados reconhecidos pelo mercado ao concluir os cursos."
  },
  {
    icon: Clock,
    title: "Aprenda no seu Ritmo",
    description: "Acesso vitalício aos conteúdos. Estude quando e onde quiser."
  },
  {
    icon: Smartphone,
    title: "Multiplataforma",
    description: "Acesse pelo computador, tablet ou celular. Sincronização automática."
  },
  {
    icon: TrendingUp,
    title: "Acompanhe Progresso",
    description: "Dashboard completo para monitorar seu desenvolvimento e conquistas."
  },
  {
    icon: Shield,
    title: "Pagamento Seguro",
    description: "Transações 100% seguras com garantia de 30 dias."
  },
  {
    icon: Globe,
    title: "Suporte 24/7",
    description: "Equipe de suporte dedicada para ajudar em qualquer momento."
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Por que escolher a
            <span className="text-primary block">Cliniks Academy?</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Nossa plataforma foi desenvolvida pensando na melhor experiência de aprendizado online, 
            com recursos modernos e intuitivos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 bg-card-gradient border-border/50 hover:border-primary/20 hover:shadow-elevation transition-all duration-300 group"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;