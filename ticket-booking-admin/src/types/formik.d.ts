declare module 'formik' {
  import { ReactNode } from 'react';

  interface FormikErrors<Values> {
    [field: string]: string | string[] | FormikErrors<any> | undefined;
  }

  interface FormikTouched<Values> {
    [field: string]: boolean | FormikTouched<any> | boolean[] | undefined;
  }

  interface FormikHelpers<Values> {
    setSubmitting: (isSubmitting: boolean) => void;
    setErrors: (errors: FormikErrors<Values>) => void;
    setTouched: (touched: FormikTouched<Values>) => void;
    setValues: (values: Values) => void;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    setFieldError: (field: string, message: string) => void;
    setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
    validateForm: (values?: any) => Promise<FormikErrors<Values>>;
    validateField: (field: string) => Promise<void> | Promise<string | undefined>;
    resetForm: (nextState?: any) => void;
  }

  interface FormikConfig<Values> {
    initialValues: Values;
    onSubmit: (values: Values, formikHelpers: FormikHelpers<Values>) => void | Promise<any>;
    validationSchema?: any;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    enableReinitialize?: boolean;
  }

  interface FormikProps<Values> extends FormikHelpers<Values> {
    initialValues: Values;
    values: Values;
    errors: FormikErrors<Values>;
    touched: FormikTouched<Values>;
    isSubmitting: boolean;
    isValidating: boolean;
    submitCount: number;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
    handleChange: (e: React.ChangeEvent<any>) => void;
    handleBlur: (e: React.FocusEvent<any>) => void;
    handleReset: (e: React.SyntheticEvent<any>) => void;
  }

  export function Formik<Values>(props: FormikConfig<Values> & {
    children: (props: FormikProps<Values>) => ReactNode;
  }): JSX.Element;

  export function Form(props: { children: ReactNode } & React.FormHTMLAttributes<HTMLFormElement>): JSX.Element;
  
  export function Field(props: any): JSX.Element;
  
  export { FormikHelpers };
}
