import { Notify } from 'quasar';

export const parseErrorMessage = (
  err: any,
  fallbackMessage = 'Unknwon error'
): string => {
  if (process.env.NODE_ENV === 'development')
    console.log(err?.data?.error || err);
  return err?.data?.error?.message ?? err?.message ?? fallbackMessage;
};

export const notifyErrorMessage = (
  err: any,
  fallbackMessage = 'Unknwon error'
): void => {
  Notify.create({
    message: parseErrorMessage(err, fallbackMessage),
    color: 'negative',
  });
};
