# Labellezaoculta

## Current State

App de galería fotográfica con panel de administración. Backend en Motoko con autorización por roles, álbumes y fotos. Frontend en React/TypeScript completamente en español. El acceso admin usa Internet Identity.

**Problema crítico actual**: Para activar una cuenta como admin, el sistema requiere un token (`CAFFEINE_ADMIN_TOKEN`) que el usuario no puede encontrar en ningún lugar visible de la interfaz de Caffeine. Esto bloquea completamente el acceso al panel de administración.

## Requested Changes (Diff)

### Add
- Nueva función pública `registerAsAdmin` en el backend que registra al llamador como admin si no hay ningún admin asignado aún, o como usuario si ya hay un admin. No requiere token.

### Modify
- Backend: La lógica de registro de primer administrador debe funcionar automáticamente: el primer usuario autenticado que llame a `registerAsAdmin` se convierte en admin sin necesidad de token.
- Frontend AdminPanel: Eliminar el formulario de token (`ActivationForm`). En su lugar, cuando el usuario está autenticado pero no registrado, llamar automáticamente a `registerAsAdmin` y mostrar un estado de carga mientras se procesa. Si la llamada tiene éxito y el usuario es admin, mostrar el panel. Si es usuario normal (ya había un admin), mostrar "Acceso denegado".

### Remove
- El formulario de activación con campo de token (`ActivationForm` component y su lógica)
- La dependencia de `useInitializeAdmin` en el AdminPanel (puede mantenerse en useQueries.ts pero no se usa en el flujo principal)

## Implementation Plan

1. Regenerar backend Motoko con nueva función `registerAsAdmin` pública (sin autenticación de token) que asigna rol admin al primer caller o rol user a los siguientes.
2. Actualizar `useQueries.ts`: agregar hook `useRegisterAsAdmin` que llama a `registerAsAdmin`.
3. Actualizar `AdminPanel.tsx`: cuando `isRegistered` es false, llamar automáticamente a `registerAsAdmin` en lugar de mostrar formulario de token. Mostrar spinner durante el proceso.
