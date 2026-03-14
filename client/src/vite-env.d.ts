/// <reference types="vite/client" />

declare module '*.tsx' {
  import React from 'react';
  export default React.ComponentType<any>;
}
