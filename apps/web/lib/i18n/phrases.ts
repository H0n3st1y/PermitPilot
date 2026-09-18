import type { Phrase } from "@/lib/i18n/types";

/**
 * Every piece of application chrome, in one place.
 *
 * Structured copy, not conditionals in JSX: a component asks for a key and gets
 * the right wording for the active locale and reading level. Adding Spanish or
 * a plain-English variant means editing this file, not hunting through views.
 *
 * Scope is the interface itself: navigation, tabs, buttons, statuses, the demo
 * banner, graph labels, the explainability drawer, recommended actions, and the
 * accessibility controls. Permit titles, legal descriptions, and code citations
 * stay in the fixtures, because translating a cited legal provision would mean
 * presenting an unofficial paraphrase as the law.
 */
export const PHRASES = {
  // ---------------------------------------------------------------- chrome
  "app.skipToContent": {
    en: { standard: "Skip to content" },
    es: { standard: "Saltar al contenido" },
  },
  "app.brandTagline": {
    en: { standard: "Permit roadmaps you can check" },
    es: { standard: "Rutas de permisos que puedes verificar" },
  },
  "app.footerDisclaimer": {
    en: {
      standard:
        "PermitPilot is a planning aid, not legal advice. Confirm requirements, fees, and dates with each department.",
      plain: "PermitPilot helps you plan. It is not legal advice. Check with each department before you rely on it.",
    },
    es: {
      standard:
        "PermitPilot es una ayuda de planificación, no asesoría legal. Confirme los requisitos, las tarifas y las fechas con cada departamento.",
      plain: "PermitPilot le ayuda a planificar. No es asesoría legal. Confirme con cada departamento antes de actuar.",
    },
  },
  "app.methodology": {
    en: { standard: "Methodology and limits" },
    es: { standard: "Metodología y límites" },
  },

  // ------------------------------------------------------------ demo banner
  "demo.label": {
    en: { standard: "Demo data." },
    es: { standard: "Datos de demostración." },
  },
  "demo.body": {
    en: {
      standard: "Demo Harbor is a fictional town.",
      plain: "Demo Harbor is a made-up town. The permits here are examples.",
    },
    es: {
      standard: "Demo Harbor es un pueblo ficticio.",
      plain: "Demo Harbor es un pueblo inventado. Estos permisos son ejemplos.",
    },
  },
  "demo.whatThisMeans": {
    en: { standard: "What this means" },
    es: { standard: "Qué significa esto" },
  },

  // ------------------------------------------------------------- navigation
  "nav.primary": {
    en: { standard: "Primary" },
    es: { standard: "Principal" },
  },
  "nav.newProject": {
    en: { standard: "New project" },
    es: { standard: "Nuevo proyecto" },
  },
  "nav.sampleProject": {
    en: { standard: "Sample project" },
    es: { standard: "Proyecto de muestra" },
  },
  "nav.howItWorks": {
    en: { standard: "How it works" },
    es: { standard: "Cómo funciona" },
  },
  "nav.menu": {
    en: { standard: "Menu" },
    es: { standard: "Menú" },
  },
  "nav.display": {
    en: { standard: "Display" },
    es: { standard: "Visualización" },
  },

  // --------------------------------------------------- accessibility controls
  "a11y.highContrast": {
    en: { standard: "High contrast" },
    es: { standard: "Alto contraste" },
  },
  "a11y.highContrastHint": {
    en: {
      standard: "Stronger borders, higher text contrast.",
      plain: "Makes text and edges easier to see.",
    },
    es: {
      standard: "Bordes más marcados y mayor contraste de texto.",
      plain: "Hace que el texto y los bordes se vean mejor.",
    },
  },
  "a11y.plainLanguage": {
    en: { standard: "Plain English" },
    es: { standard: "Lenguaje sencillo" },
  },
  "a11y.plainLanguageHint": {
    en: {
      standard: "Simpler wording. Requirements don't change.",
      plain: "Easier words. You still need the same permits.",
    },
    es: {
      standard: "Redacción más simple. Los requisitos no cambian.",
      plain: "Palabras más fáciles. Necesita los mismos permisos.",
    },
  },
  "a11y.language": {
    en: { standard: "Español" },
    es: { standard: "English" },
  },
  "a11y.languageHint": {
    en: {
      standard: "Translate the interface. Permit rules are unchanged.",
      plain: "Show the buttons and labels in Spanish. The permits stay the same.",
    },
    es: {
      standard: "Mostrar la interfaz en inglés. Las reglas de permisos no cambian.",
      plain: "Muestra los botones y las etiquetas en inglés. Los permisos siguen igual.",
    },
  },
  "a11y.plainIndicator": {
    en: { standard: "Plain English" },
    es: { standard: "Lenguaje sencillo" },
  },
  "a11y.plainIndicatorTitle": {
    en: {
      standard: "Simplified wording is on. Legal meaning and permit requirements are unchanged.",
    },
    es: {
      standard: "La redacción simplificada está activada. El significado legal y los requisitos no cambian.",
    },
  },

  // ------------------------------------------------------------------- tabs
  "tab.roadmap": {
    en: { standard: "Roadmap" },
    es: { standard: "Ruta" },
  },
  "tab.graph": {
    en: { standard: "Graph" },
    es: { standard: "Diagrama" },
  },
  "tab.timeline": {
    en: { standard: "Timeline" },
    es: { standard: "Cronograma" },
  },
  "tab.documents": {
    en: { standard: "Documents" },
    es: { standard: "Documentos" },
  },
  "tab.fees": {
    en: { standard: "Fees" },
    es: { standard: "Tarifas" },
  },
  "tab.inspections": {
    en: { standard: "Inspections" },
    es: { standard: "Inspecciones" },
  },
  "tab.sections": {
    en: { standard: "Project sections" },
    es: { standard: "Secciones del proyecto" },
  },

  // --------------------------------------------------------------- statuses
  "status.not_started": {
    en: { standard: "Not started" },
    es: { standard: "Sin iniciar" },
  },
  "status.preparing": {
    en: { standard: "Preparing" },
    es: { standard: "En preparación" },
  },
  "status.submitted": {
    en: { standard: "Submitted" },
    es: { standard: "Enviado" },
  },
  "status.in_review": {
    en: { standard: "In review" },
    es: { standard: "En revisión" },
  },
  "status.needs_changes": {
    en: { standard: "Changes requested" },
    es: { standard: "Cambios solicitados" },
  },
  "status.approved": {
    en: { standard: "Approved" },
    es: { standard: "Aprobado" },
  },

  // ---------------------------------------------------------- display states
  "state.completed": {
    en: { standard: "Completed" },
    es: { standard: "Completado" },
  },
  "state.current": {
    en: { standard: "Current" },
    es: { standard: "Actual" },
  },
  "state.attention": {
    en: { standard: "Needs attention" },
    es: { standard: "Requiere atención" },
  },
  "state.blocked": {
    en: { standard: "Blocked" },
    es: { standard: "Bloqueado" },
  },
  "state.upcoming": {
    en: { standard: "Upcoming" },
    es: { standard: "Próximo" },
  },

  // ------------------------------------------------------- graph node states
  "graph.state.approved": {
    en: { standard: "Approved" },
    es: { standard: "Aprobado" },
  },
  "graph.state.in_review": {
    en: { standard: "In review" },
    es: { standard: "En revisión" },
  },
  "graph.state.ready": {
    en: { standard: "Ready" },
    es: { standard: "Listo" },
  },
  "graph.state.blocked": {
    en: { standard: "Blocked" },
    es: { standard: "Bloqueado" },
  },
  "graph.state.not_started": {
    en: { standard: "Not started" },
    es: { standard: "Sin iniciar" },
  },

  // -------------------------------------------------------------- graph copy
  "graph.heading": {
    en: { standard: "Dependency graph" },
    es: { standard: "Diagrama de dependencias" },
  },
  "graph.intro": {
    en: {
      standard:
        "Every permit below was selected by a versioned rule, not by a language model. Select a permit to see the rule that chose it and the answers that matched.",
      plain: "Fixed rules picked these permits, not an AI. Tap a permit to see which rule picked it and why.",
    },
    es: {
      standard:
        "Cada permiso fue seleccionado por una regla versionada, no por un modelo de lenguaje. Seleccione un permiso para ver la regla que lo eligió y las respuestas que coincidieron.",
      plain: "Reglas fijas eligieron estos permisos, no una IA. Toque un permiso para ver qué regla lo eligió y por qué.",
    },
  },
  "graph.legend": {
    en: { standard: "Legend" },
    es: { standard: "Leyenda" },
  },
  "graph.legend.bottleneck": {
    en: { standard: "Current bottleneck" },
    es: { standard: "Cuello de botella actual" },
  },
  "graph.legend.critical": {
    en: { standard: "Sets the finish date" },
    es: { standard: "Define la fecha final" },
  },
  "graph.edgeLabel": {
    en: { standard: "{from} must be approved before {to}" },
    es: { standard: "{from} debe aprobarse antes de {to}" },
  },
  "graph.nodeHint": {
    en: { standard: "Select for the rule that required this permit" },
    es: { standard: "Seleccione para ver la regla que exigió este permiso" },
  },
  "graph.empty": {
    en: { standard: "This roadmap has no steps to draw." },
    es: { standard: "Esta ruta no tiene pasos que mostrar." },
  },
  "graph.fallbackNotice": {
    en: {
      standard: "Showing the roadmap as a list. The same dependencies apply.",
      plain: "Showing a list instead of the picture. The order is the same.",
    },
    es: {
      standard: "Mostrando la ruta como lista. Se aplican las mismas dependencias.",
      plain: "Mostramos una lista en vez del dibujo. El orden es el mismo.",
    },
  },

  // --------------------------------------------------- explainability drawer
  "why.title": {
    en: { standard: "Why this step?" },
    es: { standard: "¿Por qué este paso?" },
  },
  "why.close": {
    en: { standard: "Close" },
    es: { standard: "Cerrar" },
  },
  "why.requirement": {
    en: { standard: "Requirement" },
    es: { standard: "Requisito" },
  },
  "why.ruleTrace": {
    en: { standard: "Rule trace" },
    es: { standard: "Traza de la regla" },
  },
  "why.ruleTraceHint": {
    en: {
      standard: "The versioned rule that selected this permit. The same answers always select the same permits.",
      plain: "This is the rule that added this permit. The same answers always give the same result.",
    },
    es: {
      standard:
        "La regla versionada que seleccionó este permiso. Las mismas respuestas siempre seleccionan los mismos permisos.",
      plain: "Esta es la regla que agregó este permiso. Las mismas respuestas siempre dan el mismo resultado.",
    },
  },
  "why.matchedData": {
    en: { standard: "Matched application data" },
    es: { standard: "Datos de la solicitud que coincidieron" },
  },
  "why.matchedDataHint": {
    en: {
      standard: "Your answers that caused the rule above to match. Highlighted values are the ones that triggered it.",
      plain: "These answers made the rule fire. The marked ones are why.",
    },
    es: {
      standard:
        "Sus respuestas que hicieron coincidir la regla anterior. Los valores resaltados son los que la activaron.",
      plain: "Estas respuestas activaron la regla. Las marcadas son el motivo.",
    },
  },
  "why.unlockedBy": {
    en: { standard: "Unlocked by" },
    es: { standard: "Se desbloquea con" },
  },
  "why.unlocks": {
    en: { standard: "Unlocks" },
    es: { standard: "Desbloquea" },
  },
  "why.noPrerequisites": {
    en: {
      standard: "Nothing has to be approved first. You can start this now.",
      plain: "You can start this now. Nothing has to happen first.",
    },
    es: {
      standard: "No requiere aprobación previa. Puede comenzar ahora.",
      plain: "Puede empezar ahora. No hace falta nada antes.",
    },
  },
  "why.noDependents": {
    en: { standard: "No other permit waits on this one." },
    es: { standard: "Ningún otro permiso depende de este." },
  },
  "why.sources": {
    en: { standard: "Sources" },
    es: { standard: "Fuentes" },
  },
  "why.noSources": {
    en: {
      standard: "No published source could be verified for this step. Confirm it with the department.",
      plain: "We could not find an official source for this step. Ask the department.",
    },
    es: {
      standard:
        "No se pudo verificar una fuente publicada para este paso. Confírmelo con el departamento.",
      plain: "No encontramos una fuente oficial para este paso. Pregunte al departamento.",
    },
  },
  "why.ethicsTitle": {
    en: { standard: "The rules engine is the source of truth" },
    es: { standard: "El motor de reglas es la fuente de verdad" },
  },
  "why.ethicsBody": {
    en: {
      standard:
        "AI may later explain a cited passage. It cannot add a permit. Requirements, dependencies, documents, eligibility, and roadmap order come from versioned rules only.",
      plain:
        "AI can help explain wording that is already quoted. It never decides which permits you need, what order they go in, or what counts as done.",
    },
    es: {
      standard:
        "La IA puede explicar un pasaje ya citado. No puede agregar un permiso. Los requisitos, las dependencias, los documentos, la elegibilidad y el orden provienen únicamente de reglas versionadas.",
      plain:
        "La IA puede explicar un texto ya citado. Nunca decide qué permisos necesita, en qué orden van, ni qué cuenta como terminado.",
    },
  },
  "why.openStep": {
    en: { standard: "Open this permit" },
    es: { standard: "Abrir este permiso" },
  },

  // ---------------------------------------------------------------- radar
  "radar.heading": {
    en: { standard: "Current bottleneck" },
    es: { standard: "Cuello de botella actual" },
  },
  "radar.whyItMatters": {
    en: { standard: "Why it matters" },
    es: { standard: "Por qué importa" },
  },
  "radar.recommended": {
    en: { standard: "Recommended next action" },
    es: { standard: "Próxima acción recomendada" },
  },
  "radar.clear": {
    en: {
      standard: "Nothing is holding the project up right now.",
      plain: "Nothing is stuck right now.",
    },
    es: {
      standard: "Nada está deteniendo el proyecto en este momento.",
      plain: "Nada está atascado ahora mismo.",
    },
  },
  "radar.blocksOne": {
    en: {
      standard: "{blocked} cannot proceed until {step} is approved.",
      plain: "{blocked} has to wait for {step}.",
    },
    es: {
      standard: "{blocked} no puede avanzar hasta que se apruebe {step}.",
      plain: "{blocked} tiene que esperar a {step}.",
    },
  },
  "radar.blocksMany": {
    en: {
      standard: "{count} later steps cannot proceed until {step} is approved: {blocked}.",
      plain: "{count} later steps have to wait for {step}: {blocked}.",
    },
    es: {
      standard: "{count} pasos posteriores no pueden avanzar hasta que se apruebe {step}: {blocked}.",
      plain: "{count} pasos posteriores tienen que esperar a {step}: {blocked}.",
    },
  },
  "radar.blocksNone": {
    en: {
      standard: "No later step is waiting on it, but it is the oldest open item on the roadmap.",
      plain: "Nothing is waiting on it. It is just the oldest open item.",
    },
    es: {
      standard: "Ningún paso posterior lo espera, pero es el asunto abierto más antiguo de la ruta.",
      plain: "Nada lo espera. Es el asunto abierto más antiguo.",
    },
  },
  "radar.criticalNote": {
    en: {
      standard: "This step sets the projected finish date.",
      plain: "This step decides when everything finishes.",
    },
    es: {
      standard: "Este paso define la fecha final proyectada.",
      plain: "Este paso decide cuándo termina todo.",
    },
  },
  "radar.action.contact_department": {
    en: {
      standard: "Contact {department} about the pending review.",
      plain: "Call or email {department} and ask how the review is going.",
    },
    es: {
      standard: "Comuníquese con {department} sobre la revisión pendiente.",
      plain: "Llame o escriba a {department} y pregunte cómo va la revisión.",
    },
  },
  "radar.action.resubmit": {
    en: {
      standard: "Address the changes {department} requested, then resubmit.",
      plain: "Fix what {department} asked for and send it again.",
    },
    es: {
      standard: "Atienda los cambios solicitados por {department} y vuelva a enviar.",
      plain: "Arregle lo que pidió {department} y envíelo otra vez.",
    },
  },
  "radar.action.upload_documents": {
    en: {
      standard: "Upload the missing required documents before submitting to {department}.",
      plain: "Add the missing files, then send it to {department}.",
    },
    es: {
      standard: "Cargue los documentos requeridos que faltan antes de enviar a {department}.",
      plain: "Agregue los archivos que faltan y envíelo a {department}.",
    },
  },
  "radar.action.start_step": {
    en: {
      standard: "Start this application now to protect the projected finish date.",
      plain: "Start this one now so the finish date does not slip.",
    },
    es: {
      standard: "Comience esta solicitud ahora para proteger la fecha final proyectada.",
      plain: "Empiece esta ahora para que no se atrase la fecha final.",
    },
  },
  "radar.action.await_prerequisite": {
    en: {
      standard: "Wait for the prerequisite to clear before contacting {department}.",
      plain: "Wait for the earlier step to finish before you contact {department}.",
    },
    es: {
      standard: "Espere a que se libere el requisito previo antes de contactar a {department}.",
      plain: "Espere a que termine el paso anterior antes de contactar a {department}.",
    },
  },

  // ----------------------------------------------------------- project header
  "header.sampleProject": {
    en: { standard: "Sample project" },
    es: { standard: "Proyecto de muestra" },
  },
  "header.squareFeet": {
    // Non-breaking spaces: a measurement must not wrap across lines.
    en: { standard: "{value} sq ft" },
    es: { standard: "{value} pies cuadrados" },
  },
  "header.approvedCount": {
    en: { standard: "{approved} of {total} approved" },
    es: { standard: "{approved} de {total} aprobados" },
  },
  "header.stepsApproved": {
    en: { standard: "Steps approved" },
    es: { standard: "Pasos aprobados" },
  },
  "header.allComplete": {
    en: { standard: "All steps complete" },
    es: { standard: "Todos los pasos completos" },
  },
  "header.projectedFinish": {
    en: { standard: "Projected finish {range}" },
    es: { standard: "Finalización prevista {range}" },
  },
  "header.target": {
    en: { standard: "Target {date}" },
    es: { standard: "Meta {date}" },
  },
  "header.atRisk": {
    en: { standard: " (at risk)" },
    es: { standard: " (en riesgo)" },
  },
  "header.editDetails": {
    en: { standard: "Edit details" },
    es: { standard: "Editar detalles" },
  },
  "header.addToCalendar": {
    en: { standard: "Add to calendar" },
    es: { standard: "Agregar al calendario" },
  },

  // -------------------------------------------------------------- shared UI
  "action.markApproved": {
    en: { standard: "Mark as approved" },
    es: { standard: "Marcar como aprobado" },
  },
  "action.viewStep": {
    en: { standard: "Open step" },
    es: { standard: "Abrir paso" },
  },
  "action.back": {
    en: { standard: "Back" },
    es: { standard: "Atrás" },
  },
  "common.department": {
    en: { standard: "Department" },
    es: { standard: "Departamento" },
  },
  "common.and": {
    en: { standard: "and" },
    es: { standard: "y" },
  },
} as const satisfies Record<string, Phrase>;

export type PhraseKey = keyof typeof PHRASES;
