# Guía de Despliegue en Render.com

Esta guía te ayudará a desplegar tu servidor MCP de Sweven en Render.com.

## Requisitos Previos

- Cuenta en [Render.com](https://render.com) (plan gratuito disponible)
- Cuenta en GitHub o GitLab
- Credenciales de la API de Sweven (email/password o token JWT)

## Paso 1: Preparar el Repositorio Git

Si aún no has inicializado Git en tu proyecto:

```bash
cd /Users/josedlucas/sweven-mcp-server
git init
git add .
git commit -m "Initial commit for Render deployment"
```

## Paso 2: Subir a GitHub/GitLab

### Opción A: GitHub

1. Crea un nuevo repositorio en [GitHub](https://github.com/new)
2. **No** inicialices con README, .gitignore o licencia
3. Copia la URL del repositorio
4. Ejecuta:

```bash
git remote add origin https://github.com/TU_USUARIO/sweven-mcp-server.git
git branch -M main
git push -u origin main
```

### Opción B: GitLab

1. Crea un nuevo proyecto en [GitLab](https://gitlab.com/projects/new)
2. Copia la URL del repositorio
3. Ejecuta:

```bash
git remote add origin https://gitlab.com/TU_USUARIO/sweven-mcp-server.git
git branch -M main
git push -u origin main
```

## Paso 3: Configurar en Render.com

1. **Inicia sesión** en [Render.com](https://dashboard.render.com)

2. **Conecta tu repositorio**:
   - Click en "New +" → "Web Service"
   - Conecta tu cuenta de GitHub o GitLab si aún no lo has hecho
   - Selecciona el repositorio `sweven-mcp-server`

3. **Configuración automática**:
   - Render detectará automáticamente el archivo `render.yaml`
   - Verifica que la configuración sea:
     - **Name**: sweven-mcp-server
     - **Environment**: Docker
     - **Plan**: Free

4. **Configurar Variables de Entorno**:
   
   En la sección "Environment Variables", agrega **UNA** de las siguientes opciones:

   **Opción A: Email y Password**
   ```
   SWEVEN_EMAIL = tu-email@ejemplo.com
   SWEVEN_PASSWORD = tu-contraseña
   ```

   **Opción B: Token JWT** (si ya tienes uno)
   ```
   SWEVEN_TOKEN = tu-token-jwt
   ```

   > **Nota**: Las variables `PORT` y `NODE_ENV` ya están configuradas en `render.yaml`

5. **Crear el servicio**:
   - Click en "Create Web Service"
   - Render comenzará a construir y desplegar tu aplicación

## Paso 4: Monitorear el Despliegue

1. **Ver logs de construcción**:
   - En el dashboard, verás los logs en tiempo real
   - El proceso incluye:
     - Construcción de la imagen Docker
     - Instalación de dependencias (`npm install`)
     - Compilación de TypeScript (`npm run build`)
     - Inicio del servidor

2. **Esperar a que esté "Live"**:
   - El estado cambiará de "Building" → "Deploying" → "Live"
   - Esto puede tomar 2-5 minutos en el primer despliegue

3. **Obtener la URL**:
   - Una vez "Live", copia la URL del servicio
   - Será algo como: `https://sweven-mcp-server.onrender.com`

## Paso 5: Verificar el Despliegue

### Verificación Básica

Prueba el endpoint SSE con curl:

```bash
curl https://TU-URL.onrender.com/sse
```

Deberías ver una conexión SSE que permanece abierta (no se cierra inmediatamente).

### Verificar Logs

En el dashboard de Render:
1. Ve a la pestaña "Logs"
2. Busca el mensaje: `Sweven MCP Server running on SSE at...`
3. Verifica que no haya errores de autenticación

### Probar Funcionalidad (Opcional)

Si tienes un cliente MCP configurado:
1. Configura la URL del servidor: `https://TU-URL.onrender.com`
2. Prueba las herramientas disponibles:
   - `get_team_members`
   - `get_trackings_summary`
   - `get_notes`
   - `get_work_order_details`

## Actualizaciones Futuras

Cada vez que hagas cambios en tu código:

```bash
git add .
git commit -m "Descripción de los cambios"
git push
```

Render detectará automáticamente el push y redespliegará tu aplicación.

## Troubleshooting

### El servicio no inicia

- **Revisa los logs** en Render para ver el error específico
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el repositorio esté actualizado

### Error de autenticación con Sweven API

- Verifica que `SWEVEN_EMAIL` y `SWEVEN_PASSWORD` sean correctos
- O verifica que `SWEVEN_TOKEN` sea un token JWT válido
- Revisa los logs para ver el mensaje de error específico

### El servicio se "duerme" (plan gratuito)

- En el plan gratuito, Render pone los servicios en "sleep" después de 15 minutos de inactividad
- La primera petición después del "sleep" puede tardar 30-60 segundos
- Considera actualizar a un plan de pago si necesitas disponibilidad 24/7

### Cambios en variables de entorno

Si necesitas cambiar las variables de entorno:
1. Ve al dashboard de Render
2. Selecciona tu servicio
3. Ve a "Environment"
4. Edita las variables
5. Click en "Save Changes"
6. Render redespliegará automáticamente

## Notas Importantes

- **Persistencia**: El archivo `config.json` se pierde con cada redespliegue. Usa variables de entorno para credenciales persistentes.
- **Plan Gratuito**: Incluye 750 horas/mes de tiempo de ejecución, suficiente para uso personal.
- **HTTPS**: Render proporciona HTTPS automáticamente para todos los servicios.
- **Logs**: Los logs están disponibles por 7 días en el plan gratuito.

## Recursos Adicionales

- [Documentación de Render](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)
