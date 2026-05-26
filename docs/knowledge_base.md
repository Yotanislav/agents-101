# Base de Conocimiento del Proyecto - Agents 101

## Stack Tecnológico
- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Orquestación de IA**: Vercel AI SDK (`ai-sdk`)
- **Modelo Base**: Google Gemini

## Reglas de Operación del Agente
- El agente debe usar la herramienta `research_docs` cada vez que el usuario pregunte sobre las especificaciones del proyecto, reglas de estilo, configuración de variables de entorno o glosario de términos.
- Si la información no se encuentra en este documento, el agente debe declarar explícitamente que no cuenta con esos datos en su base de conocimiento actual.