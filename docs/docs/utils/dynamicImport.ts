import { Component, markRaw } from 'vue';

/**
 * Dynamic import function to load components dynamically.
 * Its proper functioning depends on the location of this file.
 * Do not move this file from utils folder, or if you move it,
 * make sure the relative path part '../' is correct.
 *
 * This function depends on `vite-plugin-dynamic-import` library.
 * @see https://github.com/vite-plugin/vite-plugin-dynamic-import
 *
 * @param component string
 * @returns Dynamic Component Import
 */
export function dynamicImportComponent(component: string): Promise<Component> {
  // Relative path is important here, ../ points to the /src directory.
  return import(`../${component}.vue`);
}


/**
 * Dynamic import a component with fallback.
 *
 * @see {../components/table/BlTable.vue}
 * @param component
 * @param fallbackComponent
 * @param logError
 * @returns Promise<Component>
 */
export async function asyncImport(
  component: any,
  fallbackComponent?: any,
  logError = false
): Promise<Component> {
  let load: any, error: any;
  try {
    load = await dynamicImportComponent(component);
  } catch (e) {
    error = 'asyncImport() error >> ' + e + '. ';
    if (fallbackComponent) {
      error += 'Using fallback component: ' + fallbackComponent + '.vue';
      load = await dynamicImportComponent(fallbackComponent);
    }
    if (logError) {
      console.error(error);
    }
  }

  return new Promise((resolve, reject) =>
    load && load?.default ? resolve(markRaw(load.default)) : reject(error)
  );
}
