import { IField } from '@/types/field';

export const FieldsTemplates: Record<string, IField[]> = {
  email: [
    {
      prop: 'subject',
      label: 'Subject',
      type: 'text',
      readonly: true,
      openDetails: true,
      cellWidth: 300,
    },
    {
      prop: 'destination',
      label: 'Destination',
      type: 'text',
      readonly: true,
      cellWidth: 300,
    },
    {
      prop: 'latest_event',
      label: 'Latest Event',
      type: 'text',
      readonly: true,
    },
    {
      prop: 'updated_at',
      label: 'Last Update',
      type: 'date',
      readonly: true,
    },
    {
      prop: 'created_at',
      label: 'Sent On',
      type: 'date',
      readonly: true,
    },
  ],
  user: [
    {
      prop: 'email',
      label: 'Email',
      type: 'text',
      value: '',
      required: true,
      openDetails: true,
      cellWidth: 320,
      searchable: true,
      sort: true
    },
    {
      prop: 'password',
      label: 'Password',
      type: 'password',
      value: '',
    },
    {
      prop: 'role',
      label: 'Role',
      type: 'select',
      options: ['standard', 'super user'],
      value: '',
      sort: true
    },
    {
      prop: 'first_name',
      label: 'First Name',
      type: 'text',
      value: '',
      searchable: true,
      sort: true
    },
    {
      prop: 'last_name',
      label: 'Last Name',
      type: 'text',
      value: '',
      searchable: true,
      sort: true
    },
    {
      prop: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      sort: true
    },
  ],
  media: [
    {
      prop: 'id',
      readonly: true,
      label: 'Id',
      type: 'text',
      sort: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      value: '',
      cellWidth: 220,
      openDetails: true,
      searchable: true,
      sort: true
    },
    {
      required: true,
      prop: 'key',
      readonly: true,
      label: 'Key',
      type: 'text',
      value: '',
      cellWidth: 360,
      sort: true
    },
    {
      prop: 'extension',
      label: 'Extension',
      type: 'text',
      cellWidth: 150,
      sort: true
    },
    {
      prop: 'size',
      label: 'Size',
      type: 'text',
      value: '',
      sort: true
    },
    {
      prop: 'mimetype',
      label: 'Mimetype',
      type: 'text',
      cellWidth: 150,
      sort: true
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      required: true,
      cellWidth: 150,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date',
      readonly: true,
      value: '',
      cellWidth: 250,
      sort: true
    },
  ],
  tag: [
    {
      readonly: true,
      prop: 'id',
      label: 'ID',
      type: 'text',
      openDetails: true,
      cellWidth: 120,
      sort: true
    },
    {
      required: true,
      prop: 'source',
      label: 'Source',
      type: 'text',
      sort: true
    },
    {
      prop: 'source_id',
      label: 'Source Id',
      type: 'text',
      required: true,
      cellWidth: 320,
      sort: true
    },
    {
      prop: 'target',
      label: 'Target',
      type: 'text',
      required: true,
      sort: true
    },
    {
      prop: 'target_id',
      label: 'Target Id',
      type: 'text',
      required: true,
      cellWidth: 320,
      sort: true
    },
    {
      prop: 'partition',
      label: 'Partition',
      type: 'text',
      sort: true
    },
    {
      prop: 'type',
      label: 'Type',
      type: 'text',
      sort: true
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      required: true,
      sort: true
    },
    {
      prop: 'position',
      label: 'Position',
      type: 'number',
      required: false,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated At',
      type: 'date',
      readonly: true,
      cellWidth: 220,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created At',
      type: 'date',
      readonly: true,
      cellWidth: 220,
      sort: true
    },
  ],
  audit_log_action: [
    {
      readonly: false,
      prop: 'id',
      label: 'ID',
      type: 'text',
      cellWidth: 320,
      openDetails: true,
      sort: true
    },
    {
      prop: 'audit_log_request_id',
      label: 'Request Id',
      type: 'text',
      readonly: true,
      cellWidth: 320,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.ip',
      label: 'Request Ip',
      type: 'text',
      readonly: true,
      cellWidth: 150,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.user.email',
      label: 'User Email',
      type: 'text',
      readonly: false,
      cellWidth: 200,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.user.first_name',
      label: 'First Name',
      type: 'text',
      readonly: false,
      cellWidth: 100,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.user.last_name',
      label: 'Last Name',
      type: 'text',
      readonly: false,
      cellWidth: 100,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.method',
      label: 'Request Method',
      type: 'text',
      readonly: false,
      cellWidth: 100,
      sort: true
    },
    {
      prop: 'audit_log_request.route',
      label: 'Request Route',
      type: 'text',
      readonly: false,
      cellWidth: 220,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.url',
      label: 'Request Url',
      type: 'text',
      readonly: false,
      cellWidth: 450,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.params',
      label: 'Request Params',
      type: 'textarea',
      readonly: false,
      cellWidth: 220,
      sort: true
    },
    {
      prop: 'audit_log_request.affected_models',
      label: 'Affected Models',
      type: 'text',
      readonly: true,
      cellWidth: 220,
      sort: true
    },
    {
      prop: 'audit_log_request.entity_name',
      label: 'Main Entity Name',
      type: 'text',
      readonly: true,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.entity_id',
      label: 'Main Entity Id',
      type: 'text',
      readonly: true,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.message',
      label: 'Message',
      type: 'text',
      readonly: false,
      cellWidth: 220,
      searchable: true,
      sort: true
    },
    {
      prop: 'entity_name',
      label: 'Entity Name',
      type: 'text',
      readonly: false,
      required: true,
      cellWidth: 150,
      searchable: true,
      sort: true
    },
    {
      prop: 'entity_id',
      label: 'Entity Id',
      type: 'text',
      readonly: false,
      required: true,
      cellWidth: 320,
      searchable: true,
      sort: true
    },
    {
      prop: 'entity_action',
      label: 'Entity Action',
      type: 'text',
      readonly: true,
      cellWidth: 80,
      searchable: true,
      sort: true
    },
    {
      prop: 'old_data',
      label: 'Old Data',
      type: 'text',
      readonly: true,
      cellWidth: 220,
      sort: true
    },
    {
      prop: 'new_data',
      label: 'New Data',
      type: 'text',
      readonly: true,
      cellWidth: 220,
      searchable: true,
      sort: true
    },
    {
      prop: 'audit_log_request.status',
      label: 'Status',
      type: 'text',
      readonly: false,
      required: true,
      searchable: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created At',
      type: 'date_time',
      readonly: true,
      cellWidth: 120,
      searchable: true,
      sort: true
    },
  ],
  transaction_instalment: [
    {
      prop: 'order',
      label: '#',
      type: 'number',
      openDetails: false,
      readonly: false,
    },
    {
      prop: 'name',
      label: 'Instalment Name',
      type: 'text',
      openDetails: true,
      required: true,
      readonly: false,
    },
    {
      prop: 'date',
      label: 'Date',
      type: 'date',
      readonly: true,
      hideInEdit: true,
    },
    {
      prop: 'date_formula',
      label: 'Date Formula',
      type: 'date_formula',
      readonly: true,
      hideInEdit: true,
    },
    {
      prop: 'amount',
      label: 'Amount',
      type: 'text',
      rounding: true,
      readonly: true,
      hideInEdit: true,
    },
    {
      prop: 'amount_formula',
      label: 'Amount Formula',
      type: 'formula',
      variables: ['total_price', 'payments', 'commissions', 'netTaxes'],
      params: { items_field_prop: 'transaction_items' },
      readonly: true,
      hideInEdit: true,
    },
    {
      prop: 'total_received',
      label: 'Received',
      type: 'text',
      openDetails: true,
      readonly: true,
    },
    {
      prop: 'total_paid',
      label: 'Paid',
      type: 'text',
      openDetails: true,
      readonly: true,
    },
  ],
};
