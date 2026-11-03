/* Quelec · Catálogo artístico MQ01 · peinados y visor MQ02 · 2026-11-02.
 * Los libros y peinados son propuestas de estudio. Los antecedentes del cuaderno v7
 * se conservan como referencia; no acreditan prueba sobre intérpretes ni aprobación.
 */
export const GROUPS = [
  { id:'familia', name:'Familia', icon:'heart', palette:'familia', description:'Calidez, parentesco y gesto legible.' },
  { id:'grunones', name:'Gruñones', icon:'frown', palette:'grunones', description:'Gamas bajas, retícula y humor.' },
  { id:'viajeros', name:'Viajeros', icon:'compass', palette:'viajeros', description:'Intervención ampliada, arcos y planos de color.' },
  { id:'muneco', name:'Muñeco · acróbatas', icon:'sparkles', palette:'muneco', description:'Crema, puntos y franjas; parentesco con el muñeco.' },
  { id:'ciudadanos', name:'Ciudadanos · danza', icon:'users', palette:'ciudadanos', description:'Diagonales o retículas compartidas por el conjunto.' },
  { id:'coro', name:'Coristas', icon:'music', palette:'coro', description:'Cejas amplias, boca móvil y pómulos modelados.' },
  { id:'mobiliario', name:'Personajes mobiliario', icon:'lamp', palette:'mobiliario', description:'Lámpara, perchero y matera: propuestas por material.' },
  { id:'musicos', name:'Músicos', icon:'music', palette:'ciudad', description:'Reservar sin producto la zona de embocadura en vientos.' },
  { id:'manipuladores', name:'Manipuladores', icon:'hand', palette:'tierras', description:'Bases genéricas para estudiar su presencia escénica.' }
];

export const SUBJECTS = [
  {id:'quelec',name:'Quelec',group:'familia',gender:'male',photoSet:'01',code:'Q01',note:'Base cálida, rubor coral difuminado y cejas curvas. La pátina no añade edad al niño.'},
  {id:'hermano',name:'El hermano',group:'familia',gender:'male',photoSet:'02',code:'H01',note:'Parentesco con Quelec; cejas más largas y sombras de viaje.'},
  {id:'hermano-funambulista',name:'Hermano funambulista',group:'familia',gender:'male',photoSet:'03',code:'H01 · adaptación',note:'Conservar ficha separada del intérprete; la aplicación de H01 es una propuesta por revisar.'},
  {id:'abuela',name:'La abuela',group:'familia',gender:'female',photoSet:'04',code:'A01',note:'Calidez, rubor melocotón y pliegues modelados; preservar la movilidad.'},
  {id:'capitan',name:'Gruñón Capitán',group:'grunones',gender:'male',photoSet:'05',code:'G04 · referencia principal',note:'Retícula irregular ceniza, topo y ocre apagado. La asignación a G04 se revisa con dirección.'},
  {id:'chismosa',name:'Gruñona chismosa',group:'grunones',gender:'female',photoSet:'06',code:'G01–G03 · por asignar',note:'Gamas bajas y cejas expresivas. Su cambio de actitud conserva el maquillaje.',photoNote:'Vista 3/4 izquierda corregida por el usuario el 2 de noviembre de 2026; cinco vistas distintas verificadas.'},
  {id:'tiempo',name:'Gruñón del tiempo',group:'grunones',gender:'male',photoSet:'07',code:'G01–G03 · por asignar',note:'Explorar ritmo lineal y modelado de ojeras dentro del código común; propuesta.'},
  {id:'reganona',name:'Gruñona regañona',group:'grunones',gender:'female',photoSet:'08',code:'G01–G03 · por asignar',note:'Explorar cejas y comisuras descendentes sin inmovilizar el gesto.'},
  {id:'viajero',name:'El Viajero',group:'viajeros',gender:'male',photoSet:null,code:'V01–V03 · por asignar',note:'Rostro genérico hasta incorporar fotografía; combinación estable durante la función.'},
  {id:'auxiliar-hombre',name:'Auxiliar hombre',group:'viajeros',gender:'male',photoSet:null,code:'V01–V03 · por asignar',note:'Rostro genérico; explorar turquesa, óxido, ocre, coral o violeta.'},
  {id:'auxiliar-mujer',name:'Auxiliar viajera',group:'viajeros',gender:'female',photoSet:'09',code:'V01–V03 · por asignar',note:'Fotografías aportadas; escoger una combinación estable y comprobar lectura.'},
  {id:'muneco-mujer',name:'Muñeco · acróbata mujer',group:'muneco',gender:'female',photoSet:null,code:'S01 / S02',note:'Cobertura facial completa crema con puntos y franjas; las dominantes no se asignan por género.'},
  {id:'muneco-hombre',name:'Muñeco · acróbata hombre',group:'muneco',gender:'male',photoSet:null,code:'S01 / S02',note:'Dúo turquesa y coral-amarillo; probar fijación y roce en la secuencia aérea.'},
  {id:'ciudadana',name:'Ciudadana · bailarina',group:'ciudadanos',gender:'female',photoSet:null,code:'D01 / D02',note:'Dos direcciones previas: diagonales o retícula y diagonales.'},
  {id:'ciudadano',name:'Ciudadano · bailarín',group:'ciudadanos',gender:'male',photoSet:null,code:'D01 / D02',note:'Comparar geometrías compartidas; mantener la misma aplicación durante la obra.'},
  {id:'corista-mujer',name:'Corista mujer',group:'coro',gender:'female',photoSet:null,code:'C01',note:'Arco de cejas amplio, pómulos modelados y comisuras definidas; boca móvil.'},
  {id:'corista-hombre',name:'Corista hombre',group:'coro',gender:'male',photoSet:null,code:'C01',note:'El canto debe conservar movilidad; graduar contraste para plaza y cámara.'},
  {id:'lampara',name:'Lámpara',group:'mobiliario',gender:'female',photoSet:null,code:'MQ01 · propuesta',note:'Explorar marfil, ámbar y latón como relación con el objeto; asignación de intérprete pendiente.'},
  {id:'perchero',name:'Perchero',group:'mobiliario',gender:'male',photoSet:null,code:'MQ01 · propuesta',note:'Explorar nogal, óxido y líneas verticales; asignación de intérprete pendiente.'},
  {id:'matera',name:'Matera',group:'mobiliario',gender:'female',photoSet:null,code:'MQ01 · propuesta',note:'Explorar terracota y verdes hoja. El libreto describe esquinero con matas; el usuario pide matera.'},
  {id:'musica',name:'Música · rostro femenino',group:'musicos',gender:'female',photoSet:null,code:'M01 / M02 / M03',note:'Para vientos, reservar labios y superficie de contacto de embocadura, incluida la base.'},
  {id:'musico',name:'Músico · rostro masculino',group:'musicos',gender:'male',photoSet:null,code:'M01 / M02 / M03',note:'M03 cubre toda la cara solo para instrumentos sin contacto bucal.'},
  {id:'manipuladora',name:'Manipuladora',group:'manipuladores',gender:'female',photoSet:null,code:'MQ01 · propuesta',note:'Rostro genérico; grado de intervención y visibilidad por definir con dirección.'},
  {id:'manipulador',name:'Manipulador',group:'manipuladores',gender:'male',photoSet:null,code:'MQ01 · propuesta',note:'Rostro genérico; grado de intervención y visibilidad por definir con dirección.'},
  {id:'generica-mujer',name:'Genérica femenina',group:'manipuladores',gender:'female',photoSet:null,code:'Base de estudio',note:'Base editable sin asociación con una persona concreta.'},
  {id:'generico-hombre',name:'Genérico masculino',group:'manipuladores',gender:'male',photoSet:null,code:'Base de estudio',note:'Base editable sin asociación con una persona concreta.'}
];

const book = (id,name,group,entries,note) => ({id,name,group,note,status:'Propuesta de estudio MQ01',colors:entries.map(([name,hex])=>({name,hex}))});
export const PALETTES = [
  book('familia','Familia · tierra viva','familia',[
    ['Pergamino','#D5B996'],['Marfil cálido','#EAD7B7'],['Avena','#CBB995'],['Arena','#BC9A75'],['Miel','#B58750'],['Ocre velado','#A17B4D'],['Siena','#926448'],['Topo cálido','#827164'],['Sombra tostada','#604C40'],['Café profundo','#3F312C'],['Coral rubor','#CF7665'],['Melocotón','#D99A7D'],['Rosa arcilla','#A56361'],['Boca cálida','#9D5051'],['Luz crema','#F1E2C8'],['Carbón suave','#302D2A']],
    'Amplía las gamas cálidas Q01, H01 y A01 del cuaderno v7; no son muestras exactas del PDF.'),
  book('grunones','Gruñones · ceniza y retícula','grunones',[
    ['Hueso gris','#C9C4B5'],['Ceniza clara','#ACA99E'],['Piedra','#92958E'],['Topo','#817A6D'],['Gris humo','#6D706F'],['Pizarra','#555E61'],['Carbón','#333A3C'],['Negro velado','#242828'],['Ocre apagado','#938060'],['Oliva gris','#797C64'],['Verde cemento','#667367'],['Azul plomo','#626F79'],['Malva humo','#7E727D'],['Óxido bajo','#8C6656'],['Tierra fría','#65564C'],['Luz ceniza','#DEDACD']],
    'Gamas bajas y humor, con retículas irregulares; referencias G01–G04 del cuaderno v7.'),
  book('viajeros','Viajeros · rutas de color','viajeros',[
    ['Pergamino','#DCC9A8'],['Crema luz','#EFE1C3'],['Topo viajero','#9A887A'],['Turquesa profundo','#287E80'],['Turquesa claro','#69ACAA'],['Verde petróleo','#235B63'],['Óxido','#A75D3E'],['Siena viajera','#8F684E'],['Ocre dorado','#BE9147'],['Coral','#D77966'],['Coral oscuro','#AB5C50'],['Violeta','#78618E'],['Lavanda humo','#A18FAF'],['Azul noche','#344B63'],['Berenjena','#59465A'],['Carbón','#302F32']],
    'Desarrolla V01 turquesa/óxido, V02 ocre/coral y V03 violeta/turquesa; asignación por intérprete pendiente.'),
  book('muneco','Muñeco · puntos y franjas','muneco',[
    ['Crema opaca','#F0DBAF'],['Luz vainilla','#FFF0C9'],['Amarillo tela','#E9BD4C'],['Amarillo claro','#F4D879'],['Ocre amarillo','#BE9237'],['Coral vivo','#E9856E'],['Coral sombra','#C76150'],['Rosa cálido','#E8A59B'],['Turquesa tela','#48AAA8'],['Turquesa sombra','#287F86'],['Agua clara','#9CD1C5'],['Verde menta','#83B7A1'],['Azul tenue','#739EAD'],['Topo contorno','#8A7664'],['Tierra marca','#694E40'],['Carbón dibujo','#343333']],
    'Crema, turquesa, coral y amarillo provienen del parentesco muñeco/straps en v7 pp. 8–9; cobertura completa.'),
  book('ciudadanos','Ciudadanos · planos y diagonales','ciudadanos',[
    ['Cal','#D8D2BB'],['Papel envejecido','#BCB49A'],['Arena urbana','#A7997E'],['Ocre','#AA8952'],['Tierra diagonal','#8D674E'],['Teja','#A4715B'],['Verde gris','#83907E'],['Salvia','#9BA58D'],['Oliva','#68725D'],['Azul hormigón','#75868B'],['Acero azul','#596D78'],['Topo plano','#817A71'],['Malva cemento','#8C7B85'],['Grafito','#4A4E4E'],['Luz yeso','#ECE4CD'],['Carbón línea','#2E3435']],
    'Desarrollo de las alternativas D01 y D02; la transformación escénica no exige cambiar el maquillaje.'),
  book('coro','Coro · voces y arcos','coro',[
    ['Marfil voz','#E5D8BF'],['Pergamino claro','#D5C4A6'],['Arena canto','#BEA585'],['Ocre suave','#B39461'],['Topo arco','#8A7A6D'],['Tierra pómulo','#986E56'],['Siena sombra','#795544'],['Rubor coral','#C78070'],['Rosa tenue','#C19588'],['Boca arcilla','#A36760'],['Oliva velada','#90947B'],['Verde humo','#728178'],['Azul gris','#7F8D96'],['Malva gris','#988895'],['Luz de arco','#F2E7D4'],['Carbón ceja','#3E3834']],
    'C01: arco de cejas amplio y modelado legible que conserve la movilidad del canto.'),
  book('mobiliario','Mobiliario · materia y luz','mobiliario',[
    ['Marfil lámpara','#E8DCC3'],['Ámbar pantalla','#CCA260'],['Latón','#AA894D'],['Oro viejo','#8B7849'],['Sombra latón','#665A3D'],['Nogal','#71543F'],['Madera media','#9F7955'],['Madera luz','#C09C6F'],['Óxido perchero','#A46643'],['Terracota','#B77558'],['Arcilla clara','#CB9678'],['Tierra húmeda','#604D3D'],['Hoja','#6C865C'],['Musgo','#8B966B'],['Verde oscuro','#3F5D4B'],['Luz hoja','#B5BD8E']],
    'Nueva propuesta MQ01 para lámpara, perchero y matera; no es una paleta fijada por la dramaturgia.'),
  book('natural','Naturalista · piel y gesto',null,[
    ['Marfil neutro','#EAD9BF'],['Beige claro','#D4B99A'],['Arena natural','#BD9979'],['Miel piel','#AE825E'],['Canela','#956849'],['Castaño','#79503C'],['Ébano cálido','#4C342A'],['Sombra neutra','#5E514B'],['Topo piel','#9A8473'],['Rosa piel','#C48E80'],['Coral piel','#C67966'],['Ciruela boca','#8B5860'],['Melocotón piel','#D4A085'],['Oliva corrector','#959678'],['Luz hueso','#F1E5D0'],['Ceja humo','#3F3833']],
    'Muestrario de estudio; adaptar siempre al tono y subtono del intérprete. No sustituye el color real de su fotografía.'),
  book('tierras','Tierras · pátinas',null,[
    ['Caolín','#E3D8C3'],['Arena seca','#CFBC98'],['Trigo','#BEA475'],['Miel tierra','#B38A4D'],['Ocre amarillo','#A17C3D'],['Ocre rojo','#A86944'],['Siena natural','#906344'],['Siena tostada','#7B4F38'],['Terracota baja','#AD765C'],['Arcilla rosa','#B88D7E'],['Tierra sombra','#62503D'],['Umber','#59463A'],['Piedra cálida','#8C8575'],['Polvo oliva','#96967B'],['Cacao','#4B352B'],['Carbón tierra','#302C28']],
    'Bases veladas y modelado compatibles con la pátina mate del antecedente.'),
  book('animales','Animales · plumas y bosque',null,[
    ['Pluma marfil','#EAE4CE'],['Pluma arena','#CABB91'],['Ocre pelaje','#B19453'],['Siena pelaje','#9B6D44'],['Castaño bosque','#6D4932'],['Musgo','#738150'],['Verde hoja','#54805C'],['Petróleo pluma','#2C6D6A'],['Turquesa pluma','#3A9596'],['Azul ala','#3F6789'],['Índigo','#3C4369'],['Ciruela pluma','#72506B'],['Carmín pluma','#A95864'],['Coral pluma','#CA7962'],['Dorado pluma','#C5AB63'],['Carbón pelaje','#2F3430']],
    'Exploración cromática para imaginarios animales; no implica añadir un nuevo personaje o cambiar el libreto.'),
  book('ciudad','Ciudad · piedra y metal',null,[
    ['Yeso','#DEDBD1'],['Piedra clara','#B9B9B0'],['Cemento','#979D99'],['Acero','#7B8587'],['Acero azul','#5F747C'],['Pizarra ciudad','#4A5B63'],['Asfalto','#343F43'],['Óxido ciudad','#A56848'],['Ladrillo','#985E4C'],['Cobre viejo','#A47F5D'],['Mostaza baja','#A38F53'],['Oliva ciudad','#808367'],['Verde vidrio','#5D8B81'],['Azul vidrio','#668C9E'],['Malva noche','#807686'],['Luz fría','#D3DFE0']],
    'Gamas para planos de danza y músicos, con contraste regulable; los acabados son seleccionables.'),
  book('neon','Neones · acentos imaginarios',null,[
    ['Limón neón','#D9F83D'],['Amarillo neón','#FFF047'],['Mandarina neón','#FF9F33'],['Naranja neón','#FF703E'],['Coral eléctrico','#FF6479'],['Rosa neón','#FF51A8'],['Fucsia neón','#E84EE5'],['Violeta eléctrico','#A76AFF'],['Lila luz','#C99BFF'],['Azul eléctrico','#517BFF'],['Cian neón','#40CDEE'],['Turquesa neón','#3FE1CF'],['Verde neón','#76EE83'],['Menta luz','#A4F4CA'],['Blanco luz','#F5F6DF'],['Noche contraste','#22233F']],
    'Nueva exploración MQ01. La vista fluorescente es una simulación de color/emisión, no una predicción de respuesta UV.'),
  book('acabados','Acabados · perlas y metales',null,[
    ['Perla crema','#E7DDCA'],['Perla rosa','#D7BFC1'],['Perla malva','#B6A8C6'],['Perla hielo','#BFCECE'],['Champaña','#D2BE91'],['Oro suave','#C5A65C'],['Oro viejo','#A08A4F'],['Bronce','#9C7951'],['Cobre','#B57D5C'],['Cobre rosa','#C49782'],['Plata','#B7BDC1'],['Estaño','#8A969C'],['Acero oscuro','#62727D'],['Grafito metal','#454F57'],['Petróleo perla','#598A87'],['Violeta perla','#8F7DA1']],
    'El color y el acabado se eligen por separado: mate, satinado, metalizado o fluorescente. Propuestas adicionales a la base mate previa.')
];
const allColors = new Map();
for(const palette of PALETTES) for(const color of palette.colors) if(!allColors.has(color.hex)) allColors.set(color.hex,{...color,book:palette.name});
PALETTES.push({id:'all',name:'Biblioteca completa',group:null,note:'Todos los colores de los libros, sin repetir valores HEX.',status:'Propuesta de estudio MQ01',colors:[...allColors.values()]});

const authoredHairNames={"short01":"Corto con frontal elevado","short02":"Corto ondulado","short03":"Media melena con raya lateral","short04":"Corto peinado hacia atrás","afro01":"Trenzado compacto","bob01":"Melena bob","bob02":"Bob con mechón lateral","braid01":"Trenza recogida","ponytail01":"Cola recogida","long01":"Cabello largo hasta la cintura"};
const authoredIndividualHair={"quelec":["short02","short01","short03","afro01","short04","ponytail01"],"hermano":["short02","short01","short04","short03","ponytail01","long01"],"hermano-funambulista":["braid01","ponytail01","long01","short02","short03","afro01"],"abuela":["bob01","bob02","ponytail01","braid01","short01","long01"],"capitan":["short04","short01","short03","short02","ponytail01","afro01"],"chismosa":["bob02","bob01","long01","braid01","ponytail01","afro01"],"tiempo":["short04","short01","short03","short02","ponytail01","long01"],"reganona":["bob01","bob02","long01","ponytail01","braid01","short01"],"viajero":["short01","short04","long01","braid01","ponytail01","short02"],"auxiliar-hombre":["short03","short01","short04","short02","ponytail01","long01"],"auxiliar-mujer":["long01","bob01","bob02","ponytail01","braid01","afro01"]};
export const HAIRSTYLES = Object.fromEntries(SUBJECTS.map(subject=>{const ids=authoredIndividualHair[subject.id]||(subject.gender==='female'?['bob01','ponytail01','braid01']:['short01','short04','afro01']);return [subject.id,ids.map(id=>({id:subject.id+'-'+id,name:authoredHairNames[id],style:id,renderStyle:id,thumbnail:'assets/hair/'+id+'/thumb.jpg',note:'Propuesta con malla de cabello de mechones y textura real; ajustar volumen y color durante la prueba con vestuario. No es una peluca aprobada.'}))];}));

export const HELP = [
  {id:'base',title:'Un diseño por intérprete',body:'El cuaderno v7 plantea una aplicación estable durante toda la función. Las variantes son alternativas para escoger en ensayo; el florecimiento transforma vestuario, luz y acción.'},
  {id:'sources',title:'Fuentes y propuestas',body:'Antecedente: Cuaderno de maquillaje v7, 26 de septiembre de 2026, pp. 2–15. Dramaturgia principal: Escenas V2, 7 de octubre de 2026. Los libros ampliados conservan las propuestas MQ01. MQ02 incorpora cabezas continuas y peinados con mallas MakeHuman; las decisiones artísticas siguen pendientes de validación.'},
  {id:'photos',title:'Fotografías y semejanza',body:'Se han aportado nueve intérpretes con cinco vistas distintas por persona. La vista 3/4 izquierda de Chismosa fue corregida y verificada. Cada cabeza MQ03 ajusta sus proporciones y rasgos a las fotografías del intérprete, en una superficie continua de rostro, cráneo y cuello. Sus ojos incorporan iris y esclera de la fotografía. Es una aproximación; no es un escaneo métrico ni una textura de color calibrada.'},
  {id:'generic',title:'Rostros genéricos',body:'Las bases masculina y femenina sirven para desarrollar personajes sin fotografía. Sus rasgos y peinados son editables y no representan a una persona identificada.'},
  {id:'hair',title:'Peinados de estudio',body:'Seis opciones para los personajes individuales y tres para cada conjunto, seleccionadas de diez mallas de cabello con textura. Son referencias de peinado sin simulación física del cabello; requieren prueba de ajuste, peluca y sujeción escénica.'},
  {id:'color',title:'Color y acabado',body:'Cada libro contiene al menos quince colores. El acabado se elige aparte: mate, satinado, metalizado o fluorescente. La respuesta de productos reales depende de la piel y la iluminación; la vista fluorescente no es una medición UV.'},
  {id:'gesture',title:'Gesto y lectura',body:'Comparar frente y perfiles con luz neutra. Comprobar sonrisa, habla, canto y movimiento, además de lectura en plaza y primer plano, antes de fijar el diseño.'},
  {id:'winds',title:'Músicos de viento',body:'El antecedente M01/M02 reserva labios y toda superficie de contacto de embocadura sin producto, incluida la base. Ajustar esa reserva con cada músico e instrumento.'},
  {id:'projects',title:'Proyectos guardados',body:'MQ03 conserva archivos .quelec v2 y las UV de MQ02 para el mapa de piel MakeHuman. Las capas de archivos MQ01 v1 usan otro mapa y no se aplican automáticamente; conserva el archivo original. Drive requiere guardar o descargar una copia y subirla manualmente a la carpeta compartida.'},
  {id:'limits',title:'Estado del estudio',body:'Las fotografías documentan el punto de partida; los maquillajes, colores, acabados y peinados de estudio no equivalen a pruebas ya realizadas sobre los intérpretes ni a diseños aprobados.'}
];

export const FINISHES = [{id:'matte',name:'Mate'},{id:'satin',name:'Satinado'},{id:'metal',name:'Metalizado'},{id:'fluorescent',name:'Fluorescente'}];
