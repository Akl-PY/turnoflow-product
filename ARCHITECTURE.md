# ARQUITECTURA DE SISTEMA — TURNOFLOW AI

## Visión General
TurnoFlow AI está diseñado bajo los principios de desacoplamiento modular, aislamiento multi-tenant y orquestación multi-agente asistida por herramientas estructuradas (Tool Calling).

```mermaid
flowchart TD
    subgraph Canales Externos
        WA[Meta WhatsApp Cloud API]
        GC[Google Calendar]
        GS[Google Sheets]
    end

    subgraph Orquestación de Flujos
        N8N[Servidor n8n]
        W1[01-incoming-messages]
        W2[02-lead-management]
        W3[03-follow-up]
        W4[04-booking-management]
        W5[05-human-handoff]
    end

    subgraph Backend Core (NestJS API)
        Auth[Auth Module / JWT]
        Tenant[Multi-Tenant Context]
        Conv[Conversations & Webhooks]
        CRM[Leads CRM]
        Booking[Appointments Engine]
        
        subgraph Motor de IA (AI Engine)
            Supervisor[Supervisor / Guardrails]
            Receptionist[Reception Agent]
            LeadIntel[Lead Intelligence Agent]
            FollowUp[Follow-Up Agent]
            BookingAg[Booking Agent]
            Adapters[AiProviderInterface: Anthropic / OpenAI / Mock]
        end
    end

    subgraph Almacenamiento
        PG[(PostgreSQL / SQLite)]
    end

    subgraph Frontend Expo
        Dashboard[Panel Web / Mobile Expo SDK 52]
        Playground[Playground Interactivo & Traces]
    end

    WA <--> W1
    W1 --> Conv
    Conv --> Supervisor
    Supervisor --> Receptionist
    Supervisor --> LeadIntel
    Supervisor --> BookingAg
    BookingAg <--> GC
    LeadIntel --> W2
    W2 --> GS
    CRM <--> PG
    Booking <--> PG
    Tenant <--> PG
    Dashboard <--> Auth
    Dashboard <--> CRM
    Playground <--> Supervisor
```

## Patrones de Diseño Implementados
1. **Patrón Adapter para Proveedores de IA (`AiProviderInterface`)**:
   Permite alternar con una sola variable de entorno entre Anthropic Claude y OpenAI GPT-4o sin alterar la lógica de negocio de los agentes.
2. **Supervisor Gatekeeper & Output Guardrails**:
   Intercepta mensajes antes de enviarlos al usuario final. Si una respuesta contiene un precio no tabulado en la base de datos o si promete una reserva sin comprobante de Calendar, la bloquea.
3. **Aislamiento Multi-Tenant**:
   Cada entidad incluye una clave foránea `organizationId` obligatoria. Ningún usuario u operador puede consultar o mutar datos ajenos a su organización.
4. **Idempotencia de Mensajes**:
   Indexación de `externalMessageId` para evitar duplicidad de respuestas automáticas ante reintentos de red de Meta WhatsApp.
