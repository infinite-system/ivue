import _ from 'lodash';

import { IKeyValue } from '@/types/core';

export const formatUpdatePayload = (payload: IKeyValue): IKeyValue => {
  const payloadCopy = _.cloneDeep(payload);
  for (const key in payloadCopy) {
    if (payloadCopy[key] === undefined) delete payloadCopy[key];
    // Ensure related items are sent as id
    const data = payloadCopy[key];
    if (data?.id) {
      // Single relation
      /* Skip '_id' suffix for media type */
      if (key === 'media' || key.endsWith('_media')) {
        payloadCopy[key] = data.id;
      } else {
        payloadCopy[`${key}_id`] = data.id;
        delete payloadCopy[key];
      }
    } else if (Array.isArray(data)) {
      // Multi relation
      payloadCopy[key] = data.map((dataItem) => {
        if (typeof dataItem === 'object') {
          const valueProp =
            '__value_prop__' in dataItem
              ? (dataItem.__value_prop__ as string)
              : 'id';
          return dataItem?.[valueProp];
        } else {
          return dataItem;
        }
      });
    } else if (data === null && !key.endsWith('_id')) {
      payloadCopy[`${key}_id`] = null;
    } else {
      payloadCopy[key] = data;
    }
  }
  // Remove project id to prevent API error
  if (payloadCopy.project_id) delete payloadCopy.project_id;
  return payloadCopy;
};

/**
 * Retrieves an items prop.
 * @param prop - usually from field prop, with dot notation support for nested objects
 * @param item
 * @returns
 */
export const getEntityProp = (prop: string, item: IKeyValue) => {
  let itemPropValue = item;
  const splitProp = prop?.split('.') || [];
  if (splitProp.length) {
    for (const prop of splitProp) {
      itemPropValue = itemPropValue[prop];
      if (itemPropValue === undefined) {
        return '--';
      }
    }
    return itemPropValue;
  }
};
