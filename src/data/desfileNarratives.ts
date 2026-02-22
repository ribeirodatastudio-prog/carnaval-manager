import { ParadeSegmentType, IncidentType } from '../types/models';

export const segmentNarratives: Record<ParadeSegmentType, { high: string[], mid: string[], low: string[] }> = {
  ComissaoDeFrente: {
    high: [
      "A Comissão de Frente surpreende! Uma coreografia complexa que mistura teatro e dança arranca aplausos de pé do Setor 1.",
      "O público prende a respiração. A iluminação interage perfeitamente com os movimentos sincronizados. Impacto visual absoluto.",
      "Inovação pura! O tripé se transforma revelando um segredo que faz a arquibancada vibrar."
    ],
    mid: [
      "A Comissão de Frente cumpre seu papel com dignidade, apresentando a escola sem grandes riscos.",
      "Movimentos corretos e figurinos adequados. Uma abertura segura para o desfile.",
      "A coreografia é clara e conta a história, embora falte aquele brilho extra de originalidade."
    ],
    low: [
      "Problemas na troca de roupa atrapalham a evolução da Comissão de Frente. O público parece confuso.",
      "O tripé emperrou brevemente, quebrando o ritmo da apresentação. A tensão é visível nos rostos dos bailarinos.",
      "Falta sincronia. A proposta coreográfica parece não ter sido totalmente assimilada pelo grupo."
    ]
  },
  AlaInicial: {
    high: [
      "As baianas giram como piões dourados, abrindo caminho com uma energia ancestral indescritível.",
      "A velha guarda passa com nobreza imperial, cantando o samba a plenos pulmões. A história viva da escola.",
      "Fantasias luxuosas e leves permitem que a primeira ala evolua com uma alegria contagiante."
    ],
    mid: [
      "As baianas passam com elegância, embora o peso das fantasias limite um pouco o giro.",
      "A velha guarda traz respeito e tradição, saudada com carinho pelo público.",
      "A ala de abertura mostra um conjunto visual coeso, introduzindo bem o enredo."
    ],
    low: [
      "Algumas baianas têm dificuldade com o vento forte. A evolução da ala inicial fica comprometida.",
      "Fantasias incompletas na ala de abertura. Um começo preocupante para a harmonia visual.",
      "A velha guarda parece cansada, e o canto não empolga as primeiras arquibancadas."
    ]
  },
  BateriaEntrance: {
    high: [
      "{staffName} comanda uma paradinha ousada! O silêncio dura um segundo eterno, e a retomada explode o Sambódromo!",
      "A 'Furiosa' entra no recuo com precisão cirúrgica. O som é limpo, potente e faz o peito tremer.",
      "Ritmo perfeito! A bossa nova introduzida por {staffName} leva o público ao delírio imediato."
    ],
    mid: [
      "A bateria sustenta o ritmo com firmeza. Sem grandes ousadias, mas com uma cadência segura.",
      "Entrada no recuo realizada sem sustos. O andamento está correto, mantendo a escola no passo.",
      "{staffName} opta pelo seguro, garantindo que o samba não atravesse."
    ],
    low: [
      "Um surdo desencontrado causa um breve momento de pânico. {staffName} precisa gesticular muito para corrigir.",
      "A entrada no recuo é tumultuada, empurrando alas vizinhas. O andamento acelera perigosamente.",
      "O som está embolado no meio da pista. A definição das caixas está se perdendo."
    ]
  },
  AlegoriaPrincipal: {
    high: [
      "O Abre-alas é um colosso de luz e movimento! A escultura principal gira e cospe fogo (frio), assombrando a Sapucaí.",
      "Gigantesco e detalhado! O acabamento do primeiro carro é de outro mundo. O enredo se materializa com perfeição.",
      "Impacto total. A grandiosidade do carro alegórico arranca gritos de 'É Campeã!' do Setor 4."
    ],
    mid: [
      "O Abre-alas passa imponente. O acabamento é bom, e a leitura do enredo é clara.",
      "Um carro bonito e correto. As esculturas contam a história sem falhas visíveis.",
      "A iluminação destaca bem os pontos fortes da alegoria, que cumpre seu papel."
    ],
    low: [
      "O Abre-alas parece pequeno para a grandiosidade do enredo. Faltou imponência.",
      "Falhas no acabamento são visíveis sob os holofotes. Algumas luzes queimadas prejudicam o efeito.",
      "O carro tem dificuldade para fazer a curva. O motorista luta, e a harmonia sofre."
    ]
  },
  AlasDesenvolvimento: {
    high: [
      "Um mar de cores! As alas fluem como um rio, sem buracos, cantando com uma força impressionante.",
      "Fantasias criativas e leves. Os componentes brincam carnaval, e a evolução é perfeita.",
      "A cromia das alas conta a história visualmente. Um show de {staffName} na concepção dos figurinos."
    ],
    mid: [
      "As alas passam compactas. O canto é audível, e a evolução segue o roteiro.",
      "Figurinos coloridos e adequados. A escola evolui sem correr, mas sem explodir.",
      "O conjunto visual é agradável, mantendo a narrativa do enredo compreensível."
    ],
    low: [
      "Buracos começam a aparecer entre as alas. A harmonia corre para fechar os espaços.",
      "Componentes sem chapéu ou com partes da fantasia na mão. O quesito Fantasia corre perigo.",
      "Alas muito apertadas ou muito espaçadas. A evolução está irregular e nervosa."
    ]
  },
  AlegoriasSecundarias: {
    high: [
      "O segundo carro é uma joia! Detalhes em palha e ouro que brilham intensamente. Arte pura.",
      "Efeitos de água impressionam no carro 3. A tecnologia a serviço do carnaval.",
      "Cada escultura tem vida. O conjunto alegórico mantém o nível altíssimo do início ao fim."
    ],
    mid: [
      "Os carros intermediários mantêm a dignidade do desfile. Boas esculturas e pintura correta.",
      "Conjunto alegórico equilibrado. Nada que choque, mas nada que comprometa.",
      "A leitura visual continua clara. O carnavalesco soube usar bem os materiais."
    ],
    low: [
      "O terceiro carro parece inacabado. Estruturas de ferro aparecem onde deveria haver decoração.",
      "Uma escultura quebrou e está pendurada. A equipe tenta esconder, mas é visível.",
      "Diferença brusca de qualidade entre o Abre-alas e os carros seguintes. Queda de rendimento visual."
    ]
  },
  DestaquesECasais: {
    high: [
      "O Mestre-Sala risca o chão como uma pena, e a Porta-Bandeira gira como um furacão controlado. Bailado divino!",
      "O casal principal é pura poesia. O pavilhão tremula com orgulho, protegido e exaltado.",
      "Sintonia telepática entre o casal. O público aplaude de pé a apresentação na cabine dupla."
    ],
    mid: [
      "O casal apresenta o pavilhão com segurança. Giros corretos e proteção constante.",
      "Boa apresentação. O Mestre-Sala corteja bem, e a Porta-Bandeira não deixa o estandarte enrolar.",
      "Cumpriram o protocolo dos jurados sem falhas, mantendo a tradição."
    ],
    low: [
      "O vento atrapalha, e a bandeira enrola por um segundo terrível. O Mestre-Sala tenta salvar.",
      "Desequilíbrio no giro. A Porta-Bandeira precisa parar bruscamente para não cair.",
      "Falta conexão. Parecem dançar sozinhos, cada um para um lado. O jurado anota."
    ]
  },
  AlaComunidade: {
    high: [
      "A comunidade desce o morro em peso! O canto é ensurdecedor, abafando até o som da avenida.",
      "Raça pura! Componentes chorando e cantando, batendo no peito. É a alma da escola.",
      "Ninguém fica parado. A evolução é vigorosa, impulsionada por um chão fortíssimo."
    ],
    mid: [
      "A comunidade canta o samba, mantendo a animação. Um desempenho sólido.",
      "Alas de comunidade preenchem bem a avenida, com componentes comprometidos.",
      "O canto é constante, embora não chegue a ser avassalador em todos os setores."
    ],
    low: [
      "Muitos componentes calados ou mascando chiclete. A 'garra' ficou no ensaio.",
      "Alas de comunidade desorganizadas, misturando-se umas com as outras.",
      "Falta de componentes. Algumas alas parecem vazias, prejudicando o visual da escola."
    ]
  },
  InterpretePeak: {
    high: [
      "{staffName} solta o grito de guerra no meio do samba e a escola responde! Catarse coletiva!",
      "A voz de {staffName} não falha! Potência e afinação que seguram o andamento lá em cima.",
      "O carro de som é uma orquestra. O samba cresce e envolve a todos na reta final."
    ],
    mid: [
      "{staffName} conduz o samba com técnica. Sem riscos, garantindo a nota.",
      "O carro de som mantém o ritmo. A harmonia entre vozes e cordas está boa.",
      "Interpretação correta, mantendo a escola no andamento certo."
    ],
    low: [
      "A voz de {staffName} falha! Rouquidão visível. O apoio tenta cobrir, mas o samba cai.",
      "Desencontro entre o carro de som e a bateria. O samba atravessa por alguns segundos.",
      "Gritos excessivos e cacos desnecessários atrapalham a compreensão da letra."
    ]
  },
  AlegoriaConclusao: {
    high: [
      "O último carro fecha o desfile com chave de ouro! Uma mensagem final impactante.",
      "Grandioso encerramento. A última alegoria deixa uma imagem poderosa na retina dos jurados.",
      "A escola sai da avenida aclamada, com um último carro luxuoso e bem acabado."
    ],
    mid: [
      "A última alegoria passa tranquila. Um encerramento digno para o desfile.",
      "Carro final correto, amarrando bem o enredo sem grandes surpresas.",
      "A escola encerra sua passagem com uma alegoria bem construída."
    ],
    low: [
      "O último carro é pobre e pequeno. Parece que o dinheiro acabou antes do fim.",
      "Problema de motor na última alegoria! O carro para e precisa ser empurrado na marra.",
      "A iluminação falha no encerramento, deixando o destaque principal no escuro."
    ]
  },
  CabosDaEscola: {
    high: [
      "A escola fecha os portões com folga no tempo. Organização impecável da Harmonia.",
      "Festa na dispersão! Diretores se abraçam, certos do dever cumprido com excelência.",
      "A velha guarda fecha o desfile chorando de emoção. A escola passou lavando a alma."
    ],
    mid: [
      "Portões fechados no tempo certo. A harmonia controlou bem o relógio.",
      "Desfile encerrado sem correrias. A escola passou compacta e organizada.",
      "Fim de desfile tranquilo. O trabalho de meses foi entregue na avenida."
    ],
    low: [
      "Correria no fim! A harmonia empurra os componentes para não estourar o tempo.",
      "A escola estoura o tempo em 1 minuto! O portão fecha com os diretores desesperados.",
      "Dispersão caótica. Alas misturadas e empurra-empurra mancham a imagem final."
    ]
  }
};

export const incidentNarratives: Record<IncidentType, { description: string, intervene: string, accept: string }[]> = {
  BateriaFalter: [
    {
      description: "Um surdo de terceira atravessa violentamente! A bateria balança e o ritmo ameaça cruzar.",
      intervene: "{staffName} gesticula furiosamente, parando o naipe e retomando na marra! O ritmo volta, mas o susto foi grande.",
      accept: "A bateria tenta se corrigir sozinha, mas o atravessamento dura longos 30 segundos. O jurado anota."
    }
  ],
  FloatBreakdown: [
    {
      description: "O eixo do Carro 3 estala! Ele para a 50 metros da segunda cabine de jurados. O buraco na evolução cresce.",
      intervene: "A equipe de mergulhadores (mecânicos) entra em ação! Empurram o carro no braço, fechando o buraco à custa de muito suor.",
      accept: "O motorista tenta religar. O carro engasga e anda aos trancos. O buraco se mantém por todo o setor."
    }
  ],
  WingGap: [
    {
      description: "A Ala 12 travou! Um buraco enorme se abre na frente do carro de som. A evolução está comprometida.",
      intervene: "A Harmonia forma um cordão humano e puxa a ala correndo! O buraco fecha, mas a elegância se perde.",
      accept: "A ala segue lenta. O buraco percorre a avenida inteira diante dos olhos dos jurados."
    }
  ],
  InterpreteCrack: [
    {
      description: "{staffName} perde a voz no refrão do meio! O som sai rouco e falhado.",
      intervene: "O intérprete de apoio assume o microfone principal instantaneamente! A energia cai um pouco, mas o samba não morre.",
      accept: "{staffName} tosse e tenta continuar. O samba se arrasta sem brilho e sem potência."
    }
  ],
  CrowdInvasion: [
    {
      description: "Torcedores empolgados pulam a grade no Setor 1 e invadem a pista, misturando-se à Ala das Baianas!",
      intervene: "A segurança da escola age rápido, retirando os invasores com firmeza. As baianas retomam o giro.",
      accept: "A escola deixa rolar. A invasão atrapalha a evolução e confunde o desenho da ala."
    }
  ],
  RainhaFall: [
    {
      description: "A Rainha de Bateria escorrega em uma garrafa d'água e vai ao chão no meio do recuo!",
      intervene: "Ela se levanta como uma fênix, sambando ainda mais forte e jogando beijos! O público aplaude a superação.",
      accept: "Ela demora a levantar, visivelmente abalada. O brilho da apresentação se apaga e a bateria sente."
    }
  ],
  FlagDropped: [
    {
      description: "O vento traiçoeiro arranca o pavilhão da mão da Porta-Bandeira! A bandeira toca o chão!",
      intervene: "O Mestre-Sala se joga para resgatar o pavilhão antes que toque o solo completamente! Um milagre, mas a penalidade é certa.",
      accept: "A bandeira cai. O silêncio no setor é mortal. A nota 10 acabou de ir embora."
    }
  ],
  UnexpectedBrilhance: [
    {
      description: "A luz do sambódromo falha por 10 segundos, mas a escola canta tão alto que parece iluminar a pista!",
      intervene: "Aproveitar o momento! A direção pede para a bateria parar e deixar só o canto. O público vem junto em êxtase!",
      accept: "A escola segue o protocolo. A luz volta, mas o momento mágico se dilui."
    }
  ],
  JudgeControversy: [
    {
      description: "Um jurado do Setor 3 parece estar de costas conversando enquanto a Comissão de Frente passa!",
      intervene: "O Diretor de Harmonia grita para chamar a atenção do jurado! Ele se vira assustado, mas olha.",
      accept: "Ignorar. Focar na apresentação. O jurado perde metade da apresentação e anotará o que viu."
    }
  ]
};
