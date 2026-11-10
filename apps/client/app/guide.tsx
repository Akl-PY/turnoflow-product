import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Smartphone,
  BookOpen,
  MessageSquare,
  BellRing,
  Calendar,
  CheckCircle2,
  FileDown,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Bot,
  User,
  Clock,
  Layers
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function GuideScreen() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);

  const openManualPdf = () => {
    if (Platform.OS === 'web') {
      window.open('https://turnoflowapi-production.up.railway.app/api/export/manual', '_blank');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Guía de Uso & Funcionamiento"
        subtitle="Aprende en 5 simples pasos cómo opera TurnoFlow AI para automatizar los turnos de tu salón"
      />

      {/* Top Banner de Descarga */}
      <View style={styles.downloadHero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.downloadHeroTitle}>Manual Visual de Implementación Rápida</Text>
          <Text style={styles.downloadHeroSub}>
            Guía ilustrada sin lenguaje técnico para dueños de salones de belleza, estéticas y spas.
          </Text>
        </View>
        <TouchableOpacity style={styles.downloadBtn} onPress={openManualPdf}>
          <FileDown size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.downloadBtnText}>Abrir Manual Imprimible / PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Barra de Navegación por Pasos */}
        <View style={styles.stepsNav}>
          {[
            { num: 1, label: '1. Conectar WhatsApp', icon: Smartphone },
            { num: 2, label: '2. Servicios & Scalinky', icon: BookOpen },
            { num: 3, label: '3. Atención con IA', icon: MessageSquare },
            { num: 4, label: '4. Alertas al Dueño', icon: BellRing },
            { num: 5, label: '5. Agenda & Turnos', icon: Calendar }
          ].map((s) => (
            <TouchableOpacity
              key={s.num}
              style={[styles.stepTab, activeStep === s.num && styles.stepTabActive]}
              onPress={() => setActiveStep(s.num)}
            >
              <s.icon size={16} color={activeStep === s.num ? '#1A73E8' : '#64748B'} />
              <Text style={[styles.stepTabText, activeStep === s.num && styles.stepTabTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ======================================================== */}
        {/* PASO 1: CONECTAR WHATSAPP CON QR */}
        {/* ======================================================== */}
        {activeStep === 1 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Conectar tu WhatsApp de Trabajo</Text>
                <Text style={styles.stepSub}>
                  Se vincula igual que cuando usas WhatsApp Web en tu computadora: en 30 segundos y sin números nuevos.
                </Text>
              </View>
            </View>

            {/* Captura / Ilustración Paso 1 */}
            <View style={styles.mockupContainer}>
              <View style={styles.mockupWindow}>
                <View style={styles.mockupHeader}>
                  <View style={styles.mockupDots}>
                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                    <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  </View>
                  <Text style={styles.mockupTitleText}>Pantalla de Vinculación WhatsApp (QR)</Text>
                </View>

                <View style={styles.qrMockupContent}>
                  <View style={styles.qrVisualBox}>
                    <View style={styles.qrDummy}>
                      <Smartphone size={36} color="#1A73E8" />
                      <Text style={styles.qrDummyText}>Código QR de Vinculación</Text>
                    </View>
                    <View style={styles.qrStatusChip}>
                      <View style={styles.greenPulse} />
                      <Text style={styles.qrStatusText}>Listo para Escanear</Text>
                    </View>
                  </View>

                  <View style={styles.qrInstructionList}>
                    <Text style={styles.instructionHeading}>Instrucciones en tu Celular:</Text>
                    <Text style={styles.instructionLine}>
                      1. Abre WhatsApp en tu teléfono de trabajo.
                    </Text>
                    <Text style={styles.instructionLine}>
                      2. Toca Menú ⋮ (Android) o Configuración ⚙️ (iPhone).
                    </Text>
                    <Text style={styles.instructionLine}>
                      3. Toca <Text style={styles.bold}>Dispositivos vinculados</Text> → <Text style={styles.bold}>Vincular un dispositivo</Text>.
                    </Text>
                    <Text style={styles.instructionLine}>
                      4. Apunta la cámara de tu celular al código QR. ¡Y listo!
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.stepFooterAction}>
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => router.push('/onboarding')}
              >
                <Text style={styles.actionLinkText}>Ir a Vincular WhatsApp ahora</Text>
                <ArrowRight size={15} color="#1A73E8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PASO 2: SERVICIOS Y SCALINKY */}
        {/* ======================================================== */}
        {activeStep === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Servicios, Precios y Sincronización</Text>
                <Text style={styles.stepSub}>
                  TurnoFlow funciona tanto con su propio catálogo integrado como sincronizado con tu turnero Scalinky.
                </Text>
              </View>
            </View>

            <View style={styles.mockupContainer}>
              <View style={styles.mockupWindow}>
                <View style={styles.mockupHeader}>
                  <Text style={styles.mockupTitleText}>¿Cómo determina el Asistente los Precios y Turnos?</Text>
                </View>

                <View style={styles.dualColumns}>
                  {/* Opción 1: Catálogo Interno */}
                  <View style={styles.optionBox}>
                    <View style={styles.optionHeader}>
                      <BookOpen size={18} color="#1A73E8" style={{ marginRight: 8 }} />
                      <Text style={styles.optionTitle}>Opción A: Catálogo Propio</Text>
                    </View>
                    <Text style={styles.optionDesc}>
                      Desde la pestaña <Text style={styles.bold}>"Servicios & Tarifas"</Text> puedes cargar tus tratamientos, precios y duración en minutos. La IA usará esa lista de forma automática sin necesidad de herramientas externas.
                    </Text>
                    <View style={styles.sampleServiceItem}>
                      <Text style={styles.sampleServiceName}>Balayage & Nutrición</Text>
                      <Text style={styles.sampleServicePrice}>$75 • 120 min</Text>
                    </View>
                    <View style={styles.sampleServiceItem}>
                      <Text style={styles.sampleServiceName}>Limpieza Facial Profunda</Text>
                      <Text style={styles.sampleServicePrice}>$40 • 60 min</Text>
                    </View>
                  </View>

                  {/* Opción 2: Scalinky */}
                  <View style={styles.optionBox}>
                    <View style={styles.optionHeader}>
                      <Layers size={18} color="#16A34A" style={{ marginRight: 8 }} />
                      <Text style={styles.optionTitle}>Opción B: Conexión Scalinky</Text>
                    </View>
                    <Text style={styles.optionDesc}>
                      Si ya usas Scalinky en tu salón, solo escribe tu identificador (slug) en <Text style={styles.bold}>Configuración → Scalinky</Text>. El bot consultará tus profesionales y disponibilidad directamente de tu cuenta.
                    </Text>
                    <View style={styles.slugExampleBox}>
                      <Text style={styles.slugExampleLabel}>Ejemplo de Identificador:</Text>
                      <Text style={styles.slugExampleValue}>esteticaglow</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.stepFooterAction}>
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => router.push('/knowledge-base')}
              >
                <Text style={styles.actionLinkText}>Configurar Servicios & Tarifas</Text>
                <ArrowRight size={15} color="#1A73E8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PASO 3: ATENCIÓN CON IA (WHATSAPP CHAT) */}
        {/* ======================================================== */}
        {activeStep === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Cómo Atiende la IA a tus Clientas</Text>
                <Text style={styles.stepSub}>
                  El asistente responde en segundos con un tono cálido y profesional, cotiza tratamientos y coordina el horario ideal.
                </Text>
              </View>
            </View>

            {/* Simulación Visual de Chat WhatsApp */}
            <View style={styles.mockupContainer}>
              <View style={styles.phoneFrame}>
                <View style={styles.phoneTopBar}>
                  <View style={styles.phoneAvatar}>
                    <Sparkles size={14} color="#1A73E8" />
                  </View>
                  <View>
                    <Text style={styles.phoneContactName}>Glow Studio (Asistente Oficial)</Text>
                    <Text style={styles.phoneOnline}>en línea las 24 hs</Text>
                  </View>
                </View>

                <View style={styles.phoneMessagesArea}>
                  {/* Clienta */}
                  <View style={[styles.bubble, styles.clientBubble]}>
                    <Text style={styles.bubbleText}>
                      ¡Hola! ¿Cuánto sale el alisado de keratina y tienen lugar este sábado?
                    </Text>
                    <Text style={styles.bubbleTime}>14:20</Text>
                  </View>

                  {/* Asistente */}
                  <View style={[styles.bubble, styles.botBubble]}>
                    <Text style={styles.bubbleText}>
                      ¡Hola Mariana! ✨ El Alisado de Keratina cuesta $80 y la sesión dura aproximadamente 90 minutos.
                      {'\n\n'}
                      Para este sábado tenemos disponibilidad a las 11:00 hs y a las 16:30 hs. ¿Cuál de los dos horarios te queda más cómodo?
                    </Text>
                    <Text style={styles.bubbleTime}>14:20</Text>
                  </View>

                  {/* Clienta */}
                  <View style={[styles.bubble, styles.clientBubble]}>
                    <Text style={styles.bubbleText}>El de las 11:00 hs me viene perfecto!</Text>
                    <Text style={styles.bubbleTime}>14:21</Text>
                  </View>

                  {/* Asistente Confirmando */}
                  <View style={[styles.bubble, styles.botBubble]}>
                    <Text style={styles.bubbleText}>
                      ¡Listo Mariana! Te agendé para el <Text style={styles.bold}>Sábado a las 11:00 hs</Text>. Te esperamos en Av. Santa Fe 2450.
                      {'\n\n'}
                      Te enviaremos un recordatorio 24 hs antes de tu visita. ¡Que tengas un hermoso día! 💖
                    </Text>
                    <Text style={styles.bubbleTime}>14:21</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.stepFooterAction}>
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => router.push('/playground')}
              >
                <Text style={styles.actionLinkText}>Probar el Simulador de Chat en Vivo</Text>
                <ArrowRight size={15} color="#1A73E8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PASO 4: ALERTAS AL DUEÑO */}
        {/* ======================================================== */}
        {activeStep === 4 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Notificaciones Inmediatas al Celular del Dueño</Text>
                <Text style={styles.stepSub}>
                  Si una clienta solicita atención humana, presenta una duda médica o un caso especial, el asistente te avisa de inmediato.
                </Text>
              </View>
            </View>

            <View style={styles.mockupContainer}>
              <View style={styles.adminAlertCard}>
                <View style={styles.adminAlertHeader}>
                  <BellRing size={20} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={styles.adminAlertTitle}>
                    Mensaje Recibido en tu WhatsApp Personal
                  </Text>
                </View>

                <View style={styles.adminAlertBody}>
                  <Text style={styles.alertHeadline}>
                    ⚠️ AVISO DE CLIENTA REQUIERE ATENCIÓN HUMANA
                  </Text>
                  <Text style={styles.alertItem}>
                    • <Text style={styles.bold}>Clienta:</Text> Laura Gómez (+5491144556677)
                  </Text>
                  <Text style={styles.alertItem}>
                    • <Text style={styles.bold}>Motivo:</Text> La clienta solicitó hablar con la dueña por un tratamiento previo.
                  </Text>
                  <Text style={styles.alertItem}>
                    • <Text style={styles.bold}>Último mensaje recibido:</Text> "Hola, me hice una coloración hace dos días y quiero consultar si me pueden ver hoy".
                  </Text>
                  <Text style={styles.alertFooter}>
                    👉 Por favor responde a su conversación cuando tengas disponibilidad.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.stepFooterAction}>
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => router.push('/onboarding')}
              >
                <Text style={styles.actionLinkText}>Verificar Teléfono del Administrador</Text>
                <ArrowRight size={15} color="#1A73E8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PASO 5: AGENDA Y TURNOS */}
        {/* ======================================================== */}
        {activeStep === 5 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Control Total de tu Agenda y Citas</Text>
                <Text style={styles.stepSub}>
                  Todos los turnos coordinados por WhatsApp se registran en tu panel con nombre, teléfono y tratamiento.
                </Text>
              </View>
            </View>

            <View style={styles.mockupContainer}>
              <View style={styles.mockupWindow}>
                <View style={styles.mockupHeader}>
                  <Text style={styles.mockupTitleText}>Vista de Agenda Confirmada</Text>
                </View>

                <View style={styles.appointmentSampleRow}>
                  <View style={styles.sampleTimeBlock}>
                    <Text style={styles.sampleTime}>11:00 - 12:30 hs</Text>
                    <Text style={styles.sampleDate}>Sábado 15 de Noviembre</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleClientName}>Mariana Costa</Text>
                    <Text style={styles.sampleClientService}>Alisado de Keratina</Text>
                  </View>
                  <View style={styles.confirmedPill}>
                    <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={styles.confirmedPillText}>Confirmado por WhatsApp</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.stepFooterAction}>
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => router.push('/appointments')}
              >
                <Text style={styles.actionLinkText}>Ir a la Agenda de Citas</Text>
                <ArrowRight size={15} color="#1A73E8" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  downloadHero: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  },
  downloadHeroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  downloadHeroSub: {
    fontSize: 13,
    color: '#E8F0FE',
    marginTop: 2
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1557B0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center'
  },
  stepsNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    marginBottom: 20,
    gap: 6,
    flexWrap: 'wrap'
  },
  stepTab: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8
  },
  stepTabActive: {
    backgroundColor: '#E8F0FE'
  },
  stepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  stepTabTextActive: {
    color: '#1A73E8',
    fontWeight: '700'
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  stepSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18
  },
  mockupContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginVertical: 12
  },
  mockupWindow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden'
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10
  },
  mockupDots: {
    flexDirection: 'row',
    gap: 6
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  mockupTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  qrMockupContent: {
    flexDirection: 'row',
    padding: 20,
    gap: 24,
    flexWrap: 'wrap'
  },
  qrVisualBox: {
    alignItems: 'center',
    width: 200
  },
  qrDummy: {
    width: 160,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10
  },
  qrDummyText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8
  },
  qrStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    gap: 6
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A'
  },
  qrStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534'
  },
  qrInstructionList: {
    flex: 1,
    minWidth: 240,
    justifyContent: 'center'
  },
  instructionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8
  },
  instructionLine: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
    lineHeight: 18
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A'
  },
  dualColumns: {
    flexDirection: 'row',
    padding: 18,
    gap: 16,
    flexWrap: 'wrap'
  },
  optionBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  optionDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 12
  },
  sampleServiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6
  },
  sampleServiceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A'
  },
  sampleServicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8'
  },
  slugExampleBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 10
  },
  slugExampleLabel: {
    fontSize: 11,
    color: '#64748B'
  },
  slugExampleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2
  },
  phoneFrame: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#EFEAE2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden'
  },
  phoneTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10
  },
  phoneAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  phoneContactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  phoneOnline: {
    fontSize: 10,
    color: '#E0F2FE'
  },
  phoneMessagesArea: {
    padding: 14,
    gap: 10
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  clientBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2
  },
  botBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E7FFDB',
    borderBottomRightRadius: 2
  },
  bubbleText: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 17
  },
  bubbleTime: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4
  },
  adminAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 18
  },
  adminAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  adminAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E'
  },
  adminAlertBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14
  },
  alertHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 8
  },
  alertItem: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4
  },
  alertFooter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8',
    marginTop: 10
  },
  appointmentSampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    flexWrap: 'wrap'
  },
  sampleTimeBlock: {
    minWidth: 160
  },
  sampleTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  sampleDate: {
    fontSize: 12,
    color: '#64748B'
  },
  sampleClientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  sampleClientService: {
    fontSize: 12,
    color: '#1A73E8',
    fontWeight: '600'
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A'
  },
  stepFooterAction: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end'
  },
  actionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A73E8'
  }
});
