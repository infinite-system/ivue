export const defaultEntityFields: Record<string, Array<Record<string, any>>> = {
  transaction: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      search: 'units.name',
      openDetails: true,
      readonly: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'is_active',
      search: true,
      sort: true,
      label: 'Active',
      type: 'text'
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'choose',
      search: true,
      sort: true,
      params: {
        useChips: true,
        options: [
          'reserved',
          'reservation_expired',
          'signing',
          'rescission',
          'firm'
        ],
        optionClass: 'text-condensed text-capitalize'
      },
      filterConfig: {
        type: 'status_badge'
      },
      override: {
        table: {
          cellTemplate: 'module/transaction/TransactionStatusBadge',
          cellParams: {
            linkToTransaction: true
          }
        },
        propertyCard: {
          cellTemplate: 'module/transaction/TransactionStatusBadge',
          cellParams: {
            linkToTransaction: true
          },
          col: 3
        }
      }
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      required: false,
      readonly: false,
      openDetails: false,
      cellWidth: 200,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          readonly: true
        }
      }
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      cellWidth: 250,
      readonly: false,
      search: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'rescission_days_remaining',
      label: 'Rescission Days Remaining',
      type: 'number',
      readonly: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'assigned_members.with_user.name',
      label: 'Assignee Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_members.with_user.email',
      label: 'Assignee Email',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_teams.name',
      label: 'Assignee Team',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'transaction_contacts.project_contact.name',
      label: 'Contact Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'transaction_contacts.project_contact.email',
      label: 'Contact Email',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'purchasers_label',
      label: 'Purchasers',
      type: 'text',
      search: true,
      readonly: true
    },
    {
      prop: 'agents_label',
      label: 'Agents',
      type: 'text',
      search: true,
      readonly: true
    },
    {
      prop: 'total_sale_price_label',
      label: 'Total Sale Price',
      type: 'text',
      sort: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'total_sale_price',
      label: 'Total Sale Price',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'items_label',
      label: 'Items',
      type: 'text',
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'reference_id',
      label: 'Reference ID',
      type: 'text',
      readonly: true,
      cellWidth: 120,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'latest_comment.content',
      label: 'Last Comment',
      type: 'text',
      cellWidth: 320,
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'latest_comment.with_user.name',
      label: 'Last Comment Author',
      type: 'text',
      cellWidth: 120,
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'unit_sale_price',
      label: 'Unit Sale Price',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'unit_sale_price_per_sqft',
      label: 'Unit Sale Price per Sqft',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'firm_date',
      label: 'Firm Date',
      type: 'date',
      search: true,
      hidden: true
    },
    {
      prop: 'extras_sale_price',
      label: 'Extras Sale Price',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_total_amount',
      label: 'Receivables Total Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_pending_amount',
      label: 'Receivables Pending Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_pending_amount_percentage',
      label: 'Receivables Pending Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_received_amount',
      label: 'Receivables Received Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_received_amount_percentage',
      label: 'Receivables Received Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_paid_amount',
      label: 'Receivables Paid Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_paid_amount_percentage',
      label: 'Receivables Paid Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_issue_amount',
      label: 'Receivables Issue Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'receivables_issue_amount_percentage',
      label: 'Receivables Issue Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_total_amount',
      label: 'Payables Total Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_pending_amount',
      label: 'Payables Pending Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_pending_amount_percentage',
      label: 'Payables Pending Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_received_amount',
      label: 'Payables Received Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_received_amount_percentage',
      label: 'Payables Received Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_paid_amount',
      label: 'Payables Paid Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_paid_amount_percentage',
      label: 'Payables Paid Amount %',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_issue_amount',
      label: 'Payables Issue Amount',
      type: 'number',
      search: true,
      hidden: true
    },
    {
      prop: 'payables_issue_amount_percentage',
      label: 'Payables Issue Amount %',
      type: 'number',
      search: true,
      hidden: true
    }
  ],
  agreement: [
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      required: false,
      sort: true
    },
    {
      prop: 'transaction_name',
      label: 'Transaction',
      type: 'open_details',
      readonly: true,
      search: true,
      required: false,

      params: {
        entity_name: 'transaction',
        entity_id_prop: 'transaction_id'
      }
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      readonly: false
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      readonly: true,
      search: true,
      required: false,
      openDetails: false
    },
    {
      prop: 'next_recipient_names',
      label: 'Actionable recipients',
      type: 'text',
      readonly: true,
      search: true
    }
  ],
  transaction_agreement: [
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      required: false,
      sort: true
    },
    {
      prop: 'transaction_name',
      label: 'Transaction',
      type: 'open_details',
      readonly: true,
      search: true,
      required: false,

      params: {
        entity_name: 'transaction',
        entity_id_prop: 'transaction_id'
      }
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      readonly: false
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      readonly: true,
      search: true,
      required: false,
      openDetails: false
    },
    {
      prop: 'recipients',
      label: 'Recipients',
      type: 'select',
      object_label: 'name',
      multipleSelect: true,
      readonly: true,
      search: true,
      required: false,
      openDetails: false
    }
  ],
  transaction_receivable: [
    {
      prop: 'from',
      label: 'From',
      type: 'select',
      options: ['developer'],
      search: true,
      sort: true
    },
    {
      prop: 'transaction_name',
      label: 'Transaction',
      type: 'open_details',
      readonly: true,
      search: true,
      required: false,
      sort: true,
      params: {
        entity_name: 'transaction',
        entity_id_prop: 'transaction_id',
        tab: 'payments'
      }
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      search: true,
      sort: true
    },
    {
      prop: 'transaction_items',
      label: 'Items',
      type: 'select',
      multipleSelect: true,
      required: true,
      eager: 'transaction_items',
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'due_date_formula',
      label: 'Due date formula',
      type: 'date_formula',
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'due_date_label',
      label: 'Due date',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'amount_formula',
      label: 'Amount Formula',
      type: 'formula',
      params: {
        items_field_prop: 'transaction_items',
        entities: ['unit', 'lot'],
        rounding: true,
        variables: ['total_price', 'payments', 'other_instalment_total_amount'],
        selectedItems: [],
        instalments: {},
        order: -1
      },
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'amount_label',
      label: 'Amount',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Last Updated',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created On',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  transaction_payable: [
    {
      prop: 'to',
      label: 'To',
      type: 'select',
      options: [
        { label: 'Purchaser', value: 'purchaser' },
        { label: 'Agent', value: 'agent' },
        { label: 'Listing Agent', value: 'listing_agent' }
      ],
      search: true,
      sort: true
    },
    {
      prop: 'transaction_name',
      label: 'Transaction',
      type: 'open_details',
      readonly: true,
      search: true,
      required: false,
      sort: true,
      params: {
        entity_name: 'transaction',
        entity_id_prop: 'transaction_id',
        tab: 'payments'
      }
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      search: true,
      sort: true
    },
    {
      prop: 'transaction_items',
      label: 'Items',
      type: 'select',
      multipleSelect: true,
      required: true,
      eager: 'transaction_items',
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'due_date_formula',
      label: 'Due date formula',
      type: 'date_formula',
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'due_date_label',
      label: 'Due date',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'amount_formula',
      label: 'Amount Formula',
      type: 'formula',
      params: {
        items_field_prop: 'transaction_items',
        entities: ['unit', 'lot'],
        rounding: true,
        variables: [
          'total_price',
          'commissions',
          'other_instalment_total_amount'
        ],
        selectedItems: [],
        instalments: {},
        order: -1
      },
      search: true,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'amount_label',
      label: 'Amount',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      readonly: true,
      hideInEdit: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Last Updated',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created On',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  transaction_document: [
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      required: false,
      openDetails: false
    },
    {
      prop: 'media.name',
      label: 'Name',
      type: 'text',
      openDetails: true,
      readonly: true,
      required: false
    },
    {
      prop: 'transaction_name',
      label: 'Transaction',
      type: 'open_details',
      readonly: true,
      search: true,
      required: false,
      params: {
        entity_name: 'transaction',
        entity_id_prop: 'transaction_id',
        tab: 'documents'
      }
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'select',
      options: [
        'reserved',
        'reservation_expired',
        'signing',
        'rescission',
        'firm'
      ],
      required: false,
      readonly: false,
      openDetails: false
    }
  ],
  project_contact: [
    {
      prop: 'first_name',
      label: 'First name',
      type: 'text',
      col: 6,
      required: true,
      search: false,
      sort: true,
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'last_name',
      label: 'Last name',
      col: 6,
      type: 'text',
      required: true,
      search: false,
      sort: true,
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      cellTemplate: 'module/contact/Contact',
      cellParams: {
        isCircleChip: false,
        useRowData: true
      },
      cellWidth: 200,
      search: true,
      sort: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      search: true,
      sort: true
    },
    {
      prop: 'email_consent',
      type: 'boolean',
      label: 'Email Consent',
      search: true,
      sort: true,
      required: false,
      readonly: true,
      hidden: true
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      required: false,
      readonly: false,
      override: {
        propertyCard: {
          hidden: true
        },
        updateForm: {
          readonly: true
        }
      },
      cellWidth: 140
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      cellWidth: 250,
      readonly: false,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'stage',
      type: 'stage',
      label: 'Stage',
      required: false,
      readonly: false,
      search: true,
      sort: true,
      cellWidth: 200,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          col: 6
        },
        createForm: {
          col: 6
        }
      }
    },
    {
      prop: 'rating',
      type: 'rating',
      label: 'Rating',
      required: false,
      readonly: false,
      search: true,
      sort: true,
      defaultValue: 'Unrated',
      cellWidth: 200,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          col: 6
        },
        createForm: {
          col: 6
        }
      }
    },
    {
      prop: 'phone',
      label: 'Phone',
      type: 'phone',
      search: true
    },
    {
      prop: 'latest_comment.content',
      label: 'Last Comment',
      type: 'text',
      cellWidth: 320,
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      label: 'Address',
      type: 'title',
      override: {
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'street_address',
      label: 'Street Address',
      type: 'address_autocomplete',
      search: true,
      sort: true,
      params: {
        street_field_prop: 'street_address',
        city_field_prop: 'city',
        state_field_prop: 'state',
        country_field_prop: 'country',
        postal_code_field_prop: 'postal_code'
      }
    },
    {
      prop: 'city',
      label: 'City',
      type: 'text',
      search: true,
      col: 6
    },
    {
      prop: 'state',
      label: 'Province',
      type: 'state',
      search: true,
      params: {
        country_field_prop: 'country'
      },
      col: 6
    },
    {
      prop: 'country',
      label: 'Country',
      type: 'country',
      search: true,
      col: 6
    },
    {
      prop: 'postal_code',
      label: 'Postal Code',
      type: 'text',
      search: true,
      col: 6
    },
    {
      label: 'Identification',
      type: 'title',
      override: {
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'date_of_birth',
      label: 'Date of Birth',
      type: 'date',
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          col: 12
        },
        createForm: {
          col: 12
        }
      }
    },
    {
      prop: 'id_media',
      label: 'ID Media',
      type: 'media',
      params: {
        canRename: true,
        canRenameCaption: false,
        accept: 'application/pdf,image/*',
        maxHeight: 'auto'
      }
    },
    {
      prop: 'id_number',
      label: 'ID Number',
      search: "other_data->>'id_number'",
      sort: "other_data->>'id_number'",
      type: 'text',
      col: 6
    },
    {
      prop: 'id_expiry',
      label: 'ID Expiry',
      search: "other_data->>'id_expiry'",
      sort: "other_data->>'id_expiry'",
      type: 'date',
      col: 6
    },
    {
      prop: 'id_jurisdiction',
      label: 'ID Jurisdiction',
      search: "other_data->>'id_jurisdiction'",
      sort: "other_data->>'id_jurisdiction'",
      type: 'text',
      col: 6
    },
    {
      prop: 'sin',
      label: 'SIN',
      type: 'text',
      search: "other_data->>'sin'",
      sort: "other_data->>'sin'",
      col: 6
    },
    {
      prop: 'nationality',
      label: 'Nationality',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'occupation',
      label: 'Occupation',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'employer',
      label: 'Employer',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      label: 'Agent',
      type: 'title',
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'is_agent',
      label: 'Is Agent',
      type: 'boolean',
      search: true,
      sort: true,
      defaultValue: false,
      logic: {
        if: [
          { '===': [{ var: 'data.is_agent' }, true] },
          {
            showFieldGroup: 'is_agent'
          },
          {
            hideFieldGroup: 'is_agent'
          }
        ]
      }
    },
    {
      prop: 'agent_title',
      label: 'Agent Title',
      type: 'text',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_agent'
    },
    {
      prop: 'brokerage_name',
      label: 'Brokerage Name',
      type: 'text',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_agent'
    },
    {
      prop: 'broker_name',
      label: 'Broker Name',
      type: 'text',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_agent'
    },
    {
      prop: 'brokerage_street_address',
      label: 'Brokerage Street Address',
      type: 'address_autocomplete',
      search: true,
      sort: true,
      fieldGroup: 'is_agent',
      params: {
        street_field_prop: 'brokerage_street_address',
        city_field_prop: 'brokerage_city',
        state_field_prop: 'brokerage_state',
        country_field_prop: 'brokerage_country',
        postal_code_field_prop: 'brokerage_postal_code'
      }
    },
    {
      prop: 'brokerage_city',
      label: 'Brokerage City',
      type: 'text',
      search: true,
      sort: true,
      fieldGroup: 'is_agent',
      col: 6
    },
    {
      prop: 'brokerage_state',
      label: 'Brokerage Province',
      type: 'text',
      search: true,
      sort: true,
      fieldGroup: 'is_agent',
      col: 6
    },
    {
      prop: 'brokerage_country',
      label: 'Brokerage Country',
      type: 'country',
      search: true,
      sort: true,
      fieldGroup: 'is_agent',
      col: 6
    },
    {
      prop: 'brokerage_postal_code',
      label: 'Brokerage Postal Code',
      type: 'text',
      search: true,
      sort: true,
      fieldGroup: 'is_agent',
      col: 6
    },
    {
      prop: 'brokerage_email',
      label: 'Brokerage Email',
      type: 'email',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_agent'
    },
    {
      prop: 'brokerage_phone',
      label: 'Brokerage Phone',
      type: 'phone',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_agent'
    },
    {
      prop: 'brokerage_fax',
      label: 'Brokerage Fax',
      type: 'phone',
      search: true,
      sort: true,
      fieldGroup: 'is_agent'
    },
    {
      label: 'Corporation',
      type: 'title',
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'is_corporation',
      label: 'Is Corporation',
      type: 'boolean',
      search: true,
      sort: true,
      logic: {
        if: [
          { '===': [{ var: 'data.is_corporation' }, true] },
          {
            showFieldGroup: 'is_corporation'
          },
          {
            hideFieldGroup: 'is_corporation'
          }
        ]
      }
    },
    {
      prop: 'corporation_name',
      label: 'Corporation Name',
      type: 'text',
      search: true,
      sort: true,
      required: false,
      fieldGroup: 'is_corporation'
    },
    {
      prop: 'corporation_number',
      label: 'Corporation Number',
      type: 'text',
      search: "other_data->>'corporation_number'",
      sort: "other_data->>'corporation_number'",
      required: false,
      fieldGroup: 'is_corporation'
    },
    {
      prop: 'assigned_members.with_user.name',
      label: 'Assignee Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_members.with_user.email',
      label: 'Assignee Email',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_teams.name',
      label: 'Assignee Team',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'age',
      label: 'Age',
      type: 'number',
      search: true,
      hidden: true
    }
  ],
  project_contact_relationship: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'project_contact_1',
      label: 'Project Contact 1',
      type: 'choose_contact',
      required: true,
      cellTemplate: 'module/contact/Contact',
      cellParams: {
        isCircleChip: false
      },
      sort: 'project_contact_1.name',
      search: 'project_contact_1.name'
    },
    {
      prop: 'project_contact_relationship_1',
      label: 'Contact Relationship 1',
      type: 'select',
      required: true,
      sort: true,
      options: ['Client', 'Agent', 'Solicitor'],
      search: true,
      openDetails: false
    },
    {
      prop: 'project_contact_2',
      label: 'Project Contact 2',
      type: 'choose_contact',
      required: true,
      cellTemplate: 'module/contact/Contact',
      cellParams: {
        isCircleChip: false
      },
      sort: 'project_contact_2.name',
      search: 'project_contact_2.name'
    },
    {
      prop: 'project_contact_relationship_2',
      label: 'Contact Relationship 2',
      type: 'select',
      required: true,
      sort: true,
      options: ['Client', 'Agent', 'Solicitor'],
      search: true,
      openDetails: false
    }
  ],
  form_response: [
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      sort: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      col: 2,
      eager: 'project_tag',
      search: true,
      download: 'project_tag_label',
      hideFromImport: true,
      override: {
        propertyCard: {
          col: 3
        }
      },
      cellWidth: 80,
      unitGridFilter: false
    },
    {
      prop: 'contacts_label',
      label: 'Contacts',
      type: 'text',
      readonly: true,
      search: true,
      openDetails: true,
      cellWidth: 200,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      required: false,
      readonly: false,
      cellWidth: 140,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          readonly: true
        }
      }
    },
    {
      prop: 'source',
      label: 'Source',
      type: 'text',
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'name',
      label: 'Form Name',
      type: 'text',
      sort: true,
      search: true,
      openDetails: true,
      fieldsClass: 'text-uppercase text-condensed',
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'text',
      readonly: true,
      filter: true,
      sort: true,
      search: true,
      cellWidth: 200,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'submitted_data',
      label: 'Submitted Data',
      type: 'text',
      hidden: true,
      search: true
    },
    // {
    //   prop: 'preference_label',
    //   label: 'Preference',
    //   type: 'text',
    //   readonly: true,
    //   cellWidth: 200,
    //   override: {
    //     propertyCard: {
    //       col: 3
    //     }
    //   }
    // },

    {
      prop: 'assigned_members.with_user.name',
      label: 'Assignee Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_members.with_user.email',
      label: 'Assignee Email',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_teams.name',
      label: 'Assignee Team',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'preference_label',
      label: 'Preferences',
      type: 'text',
      search: true,
      hidden: true
    }
  ],
  project_portal: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      search: true,
      sort: true,
      openDetails: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      required: false,
      readonly: false,
      openDetails: false,
      cellWidth: 100,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          readonly: true
        }
      }
    },
    {
      prop: 'code',
      label: 'Code',
      type: 'text',
      search: true,
      sort: true,
      required: true,
      cellTemplate: 'module/portal/PortalCode',
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'password',
      label: 'Password',
      type: 'password',
      search: false,
      sort: false,
      required: false,
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      search: true,
      sort: true,
      defaultValue: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true
    }
  ],
  unit: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      sort: 'name',
      override: {
        propertyCard: {
          col: 3
        }
      },
      unitGridFilter: false
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'status_badge',
      search: true,
      sort: true,
      hideFromImport: true,
      cellParams: {
        linkToTransaction: true
      },
      override: {
        propertyCard: {
          col: 3
        },
        bulkEditTable: {
          hidden: true
        }
      },
      unitGridFilter: false
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      required: false,
      readonly: false,
      openDetails: false,
      override: {
        propertyCard: {
          col: 3
        },
        updateForm: {
          readonly: true
        }
      },
      download: 'assignees_label',
      cellWidth: 140,
      hideFromImport: true,
      unitGridFilter: false
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      col: 2,
      eager: 'project_tag',
      search: true,
      download: 'project_tag_label',
      hideFromImport: true,
      override: {
        propertyCard: {
          col: 3
        }
      },
      cellWidth: 80,
      unitGridFilter: false
    },
    {
      prop: 'layout',
      label: 'Layout',
      sort: 'layout.name',
      search: 'layout.name',
      download: 'layout.name',
      override: {
        propertyCard: {
          col: 3
        }
      },
      type: 'choose',
      required: false,
      params: {
        icon: 'sym_o_dashboard',
        useChips: true,
        useInput: true,
        optionComponent: 'components/option/LayoutOption',
        fetchEntity: 'layout',
        fetchPath: '/project/:project_id/layout',
        createEntity: true,
        importSecondaryProp: 'variation_name'
      },
      readonly: false,
      openDetails: false
    },
    {
      prop: 'variation_name',
      label: 'Layout Variation',
      sort: 'layout.variation_name',
      search: 'layout.variation_name',
      override: {
        propertyCard: {
          col: 3
        },
        table: {
          hidden: true
        }
      },
      type: 'text',
      required: false,
      readonly: false,
      hidden: false,
      openDetails: false
    },
    {
      prop: 'lot',
      label: 'Lot',
      sort: 'lot.name',
      search: 'lot.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: false,
        fetchEntity: 'lot',
        icon: 'sym_o_image',
        fetchPath: '/project/:project_id/lot',
        createEntity: true
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'layout.all_media_filter.name',
      label: 'Floorplan',
      type: 'text',
      download: false,
      readonly: true,
      hidden: true,
      search: true,
      unitGridFilter: false
    },
    {
      prop: 'exposure',
      label: 'Exposure',
      type: 'choose',
      params: {
        useChips: true,
        options: ['N', 'NE', 'NW', 'S', 'SE', 'SW', 'E', 'W'],
        optionClass: 'text-caption text-condensed',
        multiple: true
      },
      search: true,
      sort: true,
      download: 'exposure_label',
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'price',
      label: 'Price',
      type: 'number',
      prefix: '$',
      cellTemplate: 'type/number/Price',
      col: 4,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'level',
      label: 'Level',
      type: 'number',
      col: 4,
      override: {
        propertyCard: {
          col: 3
        }
      },
      required: true,
      search: true,
      sort: true
    },
    {
      prop: 'number',
      label: 'Number',
      type: 'number',
      col: 4,
      required: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'assigned_members.with_user.name',
      label: 'Assignee Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_members.with_user.email',
      label: 'Assignee Email',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'assigned_teams.name',
      label: 'Assignee Team',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'latest_comment.content',
      label: 'Last Comment',
      type: 'text',
      col: 6,
      readonly: true,
      search: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'latest_comment.with_user.name',
      label: 'Last Comment Author',
      type: 'text',
      cellWidth: 120,
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  lot: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'lot_type',
      sort: 'lot_type.name',
      search: 'lot_type.name',
      label: 'Lot type',
      type: 'choose',
      params: {
        useChips: false,
        clearable: true,
        fetchPath: '/project/:project_id/lot_type',
        fetchEntity: 'layout',
        createEntity: false,
        optionClass: 'text-capitalize'
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'group_name',
      label: 'Group name',
      type: 'text',
      params: {},
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 2
        }
      }
    },
    {
      prop: 'number',
      label: 'Number',
      type: 'text',
      col: 6,
      required: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 1
        }
      }
    },
    {
      prop: 'price',
      label: 'Price',
      type: 'number',
      cellTemplate: 'type/number/Price',
      prefix: '$',
      col: 6,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'layouts',
      label: 'Layout Options',
      type: 'choose',
      required: false,
      params: {
        icon: 'sym_o_dashboard',
        useChips: true,
        useInput: true,
        fetchPath: '/project/:project_id/layout',
        fetchEntity: 'layout',
        createEntity: false,
        multiple: true,
        optionDescription: 'variation_name'
      },
      openDetails: false,
      override: {
        bulkEditTable: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
      // logic: {
      //   if: [
      //     { hasValue: [{ var: 'data.id' }] },
      //     {
      //       changeFieldTemplate: []
      //     },
      //     {
      //       changeFieldTemplate: ['layouts', 'hidden', true]
      //     }
      //   ]
      // }
    },
    {
      prop: 'available_layouts',
      label: 'Available Layouts',
      type: 'choose',
      required: false,
      reaonly: true,
      disable: true,
      params: {
        icon: 'sym_o_dashboard',
        useChips: true,
        useInput: true,
        fetchPath: '/project/:project_id/layout',
        fetchEntity: 'layout',
        createEntity: false,
        multiple: true,
        optionDescription: 'variation_name'
      },
      openDetails: false,
      override: {
        bulkEditTable: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'left_lot',
      label: 'Left Lot',
      sort: 'left_lot.name',
      search: 'left_lot.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: false,
        fetchEntity: 'lot',
        icon: 'sym_o_image',
        fetchPath: '/project/:project_id/lot',
        createEntity: true
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'right_lot',
      label: 'Right Lot',
      sort: 'right_lot.name',
      search: 'right_lot.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: false,
        fetchEntity: 'lot',
        icon: 'sym_o_image',
        fetchPath: '/project/:project_id/lot',
        createEntity: true
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  lot_type: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      search: true,
      sort: true,
      openDetails: true,
      hidden: false
    },
    {
      prop: 'description',
      label: 'Description',
      type: 'text',
      search: true,
      sort: true,
      hidden: false
    },
    {
      prop: 'siteplan_color',
      label: 'Siteplan Colour',
      type: 'text',
      search: true,
      sort: true,
      hidden: false
    }
  ],
  architectural_control_rule: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'name',
      type: 'text',
      search: true,
      hidden: false,
      readonly: false,
      openDetails: true
    },
    {
      prop: 'target_type',
      label: 'Rule Target Type',
      type: 'select',
      options: ['street', 'exact_lot'],
      required: true,
      search: true,
      hidden: false
    },
    {
      prop: 'prop_target',
      label: 'prop Target',
      type: 'select',
      options: [
        'layout_id',
        'variation_name',
        'layout_name',
        'lot_type',
        'group_name'
      ],
      search: true,
      hidden: false,
      readonly: false,
      openDetails: true
    },
    {
      prop: 'span',
      label: 'span',
      type: 'number',
      search: true,
      hidden: false
    },
    {
      prop: 'direction',
      label: 'direction',
      type: 'select',
      options: ['', 'L', 'R', 'Both'],
      value: '',
      search: true,
      hidden: false
    },
    {
      prop: 'percentage',
      label: 'percentage',
      type: 'number',
      search: true,
      hidden: false,
      params: {
        min: 0,
        step: 0.1
      }
    }
  ],
  architectural_lot_rule: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: false,
      openDetails: true,
      readonly: true
    },
    {
      prop: 'lot',
      label: 'Lot',
      sort: 'lot.name',
      search: 'lot.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: false,
        fetchEntity: 'lot',
        fetchPath: '/project/:project_id/lot',
        createEntity: false
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'rule_definition',
      label: 'Rule Definition',
      sort: 'rule_definition.name',
      search: 'rule_definition.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: false,
        fetchEntity: 'architectural_control_rule',
        fetchPath: '/project/:project_id/architectural_control_rule',
        createEntity: false
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'exact_lots',
      label: 'Opposing Lots (if exact_lot)',
      sort: 'exact_lots.name',
      search: 'exact_lots.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        fetchEntity: 'lot',
        icon: 'sym_o_image',
        fetchPath: '/project/:project_id/lot',
        createEntity: false
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      search: true,
      sort: true,
      defaultValue: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    }
  ],
  layout: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'variation_name',
      label: 'Variation',
      type: 'text',
      required: false,
      openDetails: false,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'group_name',
      label: 'Group',
      type: 'text',
      required: false,
      openDetails: false,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'floorplan_media',
      search: 'all_media_filter.name',
      label: 'Floorplan',
      type: 'media',
      required: false,
      cellWidth: 150,
      params: {
        multiple: true,
        canRename: true,
        canRenameCaption: false,
        accept: 'image/*',
        maxHeight: 'auto',
        maxFiles: 100
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'floorplan_pdf_media',
      label: 'Floorplan PDF',
      type: 'media',
      required: false,
      cellWidth: 50,
      params: {
        canRename: true,
        canRenameCaption: false,
        accept: '.pdf'
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'exterior_renderings_media',
      label: 'Exterior Renderings',
      type: 'media',
      required: false,
      cellWidth: 150,
      params: {
        multiple: true,
        canRename: true,
        canRenameCaption: false,
        accept: 'image/*',
        maxHeight: 'auto',
        maxFiles: 100
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'exposure',
      label: 'Exposure',
      type: 'choose',
      params: {
        useChips: true,
        options: ['N', 'NE', 'NW', 'S', 'SE', 'SW', 'E', 'W'],
        optionClass: 'text-caption text-condensed',
        multiple: true
      },
      override: {
        propertyCard: {
          col: 3
        }
      },
      search: true,
      sort: true
    },
    {
      prop: 'price',
      label: 'Price',
      type: 'number',
      cellTemplate: 'type/number/Price',
      prefix: '$',
      col: 6,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'interior_area',
      label: 'Interior area',
      type: 'number',
      col: 6,
      required: true,
      search: 'interior_area',
      sort: 'interior_area',
      params: {
        min: 0
      },
      override: {
        table: {
          prop: 'interior_area_label'
        },
        propertyCard: {
          col: 3,
          prop: 'interior_area_label'
        }
      }
    },
    {
      prop: 'bedrooms',
      label: 'Bedrooms',
      type: 'number',
      col: 6,
      required: true,
      search: true,
      sort: true,
      params: {
        min: 0
      },
      override: {
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'bathrooms',
      label: 'Bathrooms',
      type: 'number',
      col: 6,
      required: true,
      search: true,
      sort: true,
      params: {
        min: 0,
        step: 0.5
      },
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'override_type',
      label: 'Override Type',
      type: 'text',
      required: false
    },
    {
      prop: 'lots',
      label: 'Available For Lots',
      sort: 'lots.name',
      search: 'lots.name',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        fetchEntity: 'lot',
        icon: 'sym_o_image',
        fetchPath: '/project/:project_id/lot',
        createEntity: true
      },
      override: {
        propertyCard: {
          hidden: true
        }
      }
    },
    // Visible to Fields Mapper Only
    {
      prop: 'layout_spaces',
      label: 'Layout Spaces',
      type: 'json',
      searchable: false,
      params: {
        fields_mapper_only: true,
        example_json:
          '[{"type": "room", "name": "den"}, {"type": "exterior", "name": "balcony", "area": 50}]'
      },
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    // Computed Labels
    // {
    //   prop: 'area_label',
    //   label: 'Area',
    //   type: 'text',
    //   readonly: true,
    //   override: {
    //     propertyCard: {
    //       col: 3
    //     }
    //   }
    // },
    // {
    //   prop: 'area_shortened_label',
    //   label: 'Area (Short)',
    //   type: 'text',
    //   readonly: true,
    //   override: {
    //     propertyCard: {
    //       col: 3
    //     }
    //   }
    // },
    {
      prop: 'type_label',
      label: 'Type',
      type: 'text',
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'exterior_spaces_label',
      label: 'Exterior Spaces',
      type: 'text',
      readonly: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    // End of Computed Labels
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  project_item_type: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      sort: true
    },
    {
      prop: 'number_required_per_unit',
      label: 'Required per unit',
      type: 'number',
      params: {
        min: 0
      },
      col: 6,
      search: true,
      sort: true
    },
    {
      prop: 'number_required_per_lot',
      label: 'Required per lot',
      type: 'number',
      params: {
        min: 0
      },
      col: 6,
      search: true,
      sort: true
    },
    {
      prop: 'limit_per_unit',
      label: 'Limit per unit',
      type: 'number',
      params: {
        min: 0
      },
      col: 6,
      search: true,
      sort: true
    },
    {
      prop: 'limit_per_lot',
      label: 'Limit per lot',
      type: 'number',
      params: {
        min: 0
      },
      col: 6,
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  project_item: [
    {
      prop: 'id',
      label: 'Id',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      col: 6,
      required: true,
      openDetails: true,
      search: true,
      sort: true
    },
    {
      prop: 'project_item_type',
      label: 'Project Item Type',
      type: 'choose',
      sort: 'project_item_type.name',
      search: 'project_item_type.name',
      col: 6,
      params: {
        fetchEntity: 'project_item_type',
        fetchPath: '/project/:project_id/project_item_type',
        createEntity: true
      },
      required: true
    },
    {
      prop: 'preassigned_units',
      label: 'Preassigned Units',
      type: 'choose',
      params: {
        icon: 'sym_o_apartment',
        useChips: true,
        useInput: true,
        fetchPath: '/project/:project_id/unit',
        fetchEntity: 'unit',
        createEntity: true,
        multiple: true
      },
      sort: 'preassigned_units.name',
      search: 'preassigned_units.name',
      openDetails: false,
      override: {
        table: {
          hidden: true
        }
      }
    },
    {
      prop: 'preassigned_units_count',
      label: 'Preassigned Units Count',
      type: 'text',
      readonly: true
    },
    {
      prop: 'sold_count',
      label: 'Sold count',
      type: 'number',
      clearable: true,
      search: true,
      sort: true,
      readonly: true
    },
    {
      prop: 'quantity',
      label: 'Quantity',
      type: 'number',
      col: 6,
      search: true,
      sort: true,
      params: {
        min: 0
      }
    },
    {
      prop: 'price',
      label: 'Price',
      col: 6,
      type: 'number',
      cellTemplate: 'type/number/Price',
      prefix: '$',
      search: true,
      sort: true
    },
    {
      prop: 'ignore_tax',
      label: 'Ignore Tax Calculations',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'taxable',
      label: 'Taxable',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'rebatable',
      label: 'Rebatable',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'closing',
      label: 'Applies on closing',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'commissionable',
      label: 'Commissionable',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'exclude_from_total',
      label: 'Exclude from Total',
      col: 6,
      type: 'boolean',
      search: false,
      sort: false
    },
    {
      prop: 'expiry_date',
      label: 'Expiry date',
      type: 'date_time',
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  project_role: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'description',
      label: 'Description',
      type: 'text',
      required: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'permissions',
      label: 'Permissions',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        optionClass: 'text-condensed text-uppercase',
        selectAllOptions: true
      },
      cellWidth: 480,
      search: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'pages',
      label: 'Pages',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        optionClass: 'text-condensed text-uppercase',
        selectAllOptions: true
      },
      cellWidth: 480,
      search: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      sort: true,
      search: true
    }
  ],
  transaction_payment: [
    {
      prop: 'id',
      label: 'ID',
      type: 'text',
      openDetails: true,
      readonly: true,
      search: true
    },
    {
      prop: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: true,
      readonly: true,
      cellWidth: 50,
      search: true
    },
    {
      prop: 'transaction_id',
      label: 'Transaction ID',
      type: 'text',
      required: true,
      readonly: true,
      hidden: true,
      cellWidth: 50,
      search: true
    },
    {
      prop: 'transaction_instalment_id',
      label: 'transaction_instalment_id',
      type: 'text',
      required: true,
      readonly: true,
      hidden: true,
      cellWidth: 50,
      search: true
    },
    {
      prop: 'type',
      label: 'Type',
      type: 'text',
      options: [],
      value: '',
      search: true
    },
    {
      prop: 'status',
      label: 'Status',
      type: 'select',
      options: ['Received', 'Cleared', 'Voided', 'NSF'],
      value: '',
      search: true
    },
    {
      prop: 'amount',
      label: 'Amount',
      type: 'number',
      value: '',
      search: true
    },
    {
      prop: 'created_at',
      label: 'Created',
      type: 'date_time',
      value: '',
      readonly: true,
      search: true
    },
    {
      prop: 'updated_at',
      label: 'Updated',
      type: 'date_time',
      value: '',
      readonly: true,
      search: true
    }
  ],
  project_member: [
    {
      prop: 'with_user.name',
      label: 'Name',
      type: 'text',
      cellWidth: 200,
      cellTemplate: 'module/contact/Contact',
      cellParams: {
        isCircleChip: false,
        useRowData: true
      },
      search: true,
      sort: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 6,
          cellTemplate: ''
        }
      }
    },
    {
      prop: 'with_user.email',
      label: 'Email',
      type: 'text',
      search: true,
      sort: true,
      required: true,
      override: {
        createForm: {
          prop: 'email'
        },
        updateForm: {
          prop: 'email'
        },
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'project_roles',
      search: 'project_roles.name',
      label: 'Role',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        optionClass: 'text-condensed',
        fetchEntity: 'project_role',
        fetchPath: '/project/:project_id/project_role',
        createEntity: true
      },
      cellWidth: 'auto',
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'project_teams',
      search: 'project_teams.name',
      label: 'Team',
      type: 'choose',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        optionClass: 'text-condensed',
        fetchEntity: 'project_team',
        fetchPath: '/project/:project_id/project_team',
        createEntity: true
      },
      cellWidth: 'auto',
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'brokerage_name',
      label: 'Brokerage Name',
      type: 'text',
      search: true,
      sort: true,
      required: false
    },
    {
      prop: 'brokerage_street_address',
      label: 'Brokerage Street Address',
      type: 'address_autocomplete',
      search: true,
      sort: true,
      params: {
        street_field_prop: 'brokerage_street_address',
        city_field_prop: 'brokerage_city',
        state_field_prop: 'brokerage_state',
        country_field_prop: 'brokerage_country',
        postal_code_field_prop: 'brokerage_postal_code'
      }
    },
    {
      prop: 'brokerage_city',
      label: 'Brokerage City',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'brokerage_state',
      label: 'Brokerage Province',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'brokerage_country',
      label: 'Brokerage Country',
      type: 'country',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'brokerage_postal_code',
      label: 'Brokerage Postal Code',
      type: 'text',
      search: true,
      sort: true,
      col: 6
    },
    {
      prop: 'brokerage_email',
      label: 'Brokerage Email',
      type: 'email',
      search: true,
      sort: true,
      required: false
    },
    {
      prop: 'brokerage_phone',
      label: 'Brokerage Phone',
      type: 'phone',
      search: true,
      sort: true,
      required: false
    },
    {
      prop: 'brokerage_fax',
      label: 'Brokerage Fax',
      type: 'phone',
      search: true,
      sort: true
    }
  ],
  project_team: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      cellTemplate: 'module/contact/Contact',
      search: true,
      sort: true,
      cellParams: {
        isCircleChip: false,
        useRowData: true
      },
      required: true,
      override: {
        propertyCard: {
          col: 6,
          cellTemplate: ''
        }
      }
    },
    {
      prop: 'description',
      label: 'Description',
      type: 'text',
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],

  project_asset_collection: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      openDetails: true,
      search: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'sort_order',
      label: 'Sort Order',
      type: 'number',
      required: true,
      sort: true
    },
    {
      prop: 'project_portals',
      label: 'Portals',
      type: 'choose',
      search: 'project_portals.name',
      params: {
        useChips: true,
        useInput: true,
        multiple: true,
        optionClass: 'text-condensed',
        fetchEntity: 'project_portal',
        fetchPath: '/project/:project_id/project_portal'
      },
      cellWidth: 'auto',
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'project_asset_media',
      label: 'Media',
      type: 'media',
      required: false,
      params: {
        multiple: true,
        accept:
          'image/*,video/*,audio/*, .ppt, .pptx, .pdf, .doc, .docx, .xls, .xlsx, .zip, .rar, .7z'
      },
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      readonly: true,
      search: true
    },
    {
      prop: 'updated_at',
      label: 'Updated at',
      type: 'date_time',
      readonly: true,
      search: true
    }
  ],
  interaction: [
    {
      prop: 'type',
      label: 'Interaction',
      type: 'select',
      required: true,
      sort: true,
      options: [
        'Follow-up',
        'Open house',
        'Phone call',
        'Registered',
        'Sales office visit',
        'Virtual',
        'Walk-in',
        'Email',
        'Other'
      ],
      search: true,
      openDetails: true
    },
    {
      prop: 'project_contact',
      label: 'Contact',
      type: 'choose_contact',
      required: true,
      cellTemplate: 'module/contact/Contact',
      cellParams: {
        isCircleChip: false
      },
      sort: 'project_contact.name',
      search: 'project_contact.name'
    },
    {
      prop: 'date',
      label: 'Date of Interaction',
      sort: true,
      search: true,
      type: 'date_time',
      cellTemplate: 'type/date_time/DateTimeReadable',
      logic: {
        if: [
          { isFutureDate: [{ var: 'data.date' }] }, // Is Date in the future?
          {
            showFields: ['notifications', 'notification_note']
          },
          {
            hideFields: ['notifications', 'notification_note']
          }
        ]
      }
    },
    {
      prop: 'notifications',
      label: 'Notifications',
      type: 'notifications',
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'notification_note',
      label: 'Notification Note',
      type: 'textarea',
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      prop: 'assignees',
      type: 'assign',
      label: 'Assignees',
      cellWidth: 100,
      override: {
        updateForm: {
          readonly: true
        }
      }
    },
    {
      prop: 'assigned_members.with_user.name',
      label: 'Assignee Name',
      type: 'text',
      search: true,
      hidden: true
    },
    {
      prop: 'rating',
      label: 'Rating',
      type: 'star_rating',
      cellWidth: 120,
      params: {
        maxStars: 5
      },
      seach: true,
      sort: true
    },
    {
      prop: 'description',
      label: 'Description',
      type: 'textarea',
      sort: true,
      search: true,
      cellWidth: 150
    },
    {
      prop: 'interaction_media',
      label: 'Attachments',
      type: 'media',
      search: 'all_media_filter.name',
      params: {
        multiple: true
      }
    },
    {
      prop: 'latest_comment.content',
      label: 'Last Comment',
      type: 'text',
      readonly: true,
      search: true
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      cellTemplate: 'type/date_time/DateTimeReadable',
      readonly: true,
      sort: true,
      search: true
    }
  ],
  project_audience: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      openDetails: true,
      search: true
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      cellWidth: 250,
      readonly: false,
      search: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'filters',
      label: 'Filters',
      type: 'table_filter_query_builder'
    },
    {
      prop: 'subscriber_count',
      label: 'Subscriber Count',
      type: 'number',
      readonly: true,
      sort: true,
      search: true
    },
    {
      prop: 'contact_count',
      label: 'Contact Count',
      type: 'number',
      readonly: true,
      sort: true,
      search: true
    },
    {
      prop: 'updated_at',
      label: 'Updated At',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created At',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],
  project_campaign: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      openDetails: true,
      sort: true,
      search: true
    },
    {
      prop: 'subject',
      label: 'Subject',
      type: 'text',
      readonly: true,
      sort: true,
      search: true
    },
    {
      prop: 'stats.overview.sent',
      label: 'Sent',
      type: 'text',
      readonly: true,
      sort: true,
      search: true
    },
    {
      prop: 'stats.overview.delivered',
      label: 'Delivered',
      type: 'text',
      readonly: true,
      sort: true,
      search: true
    },
    {
      prop: 'created_at',
      label: 'Sent At',
      type: 'date_time',
      readonly: true,
      sort: true,
      search: true
    }
  ],
  project_email_template: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      openDetails: true
    },
    {
      prop: 'project_tag.text',
      label: 'Tags',
      type: 'tag',
      cellWidth: 250,
      readonly: false,
      search: true,
      override: {
        propertyCard: {
          col: 6
        }
      }
    },
    {
      prop: 'updated_at',
      label: 'Updated At',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    },
    {
      prop: 'created_at',
      label: 'Created At',
      type: 'date_time',
      readonly: true,
      search: true,
      sort: true
    }
  ],

  media: [
    {
      prop: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      cellWidth: 220,
      openDetails: true,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'caption',
      label: 'Caption',
      type: 'text',
      cellWidth: 120,
      search: true,
      sort: true,
      override: {
        propertyCard: {
          col: 2
        }
      }
    },
    {
      prop: 'media',
      type: 'media',
      label: 'Thumbnail',
      params: {
        canUpdateFiles: false,
        canRename: false,
        canRenameCaption: false,
        canUpdateThumbnail: true,
        isPrivate: false,
        columnLayout: 'full-width'
      },
      override: {
        table: {
          hidden: true
        },
        propertyCard: {
          hidden: true
        }
      }
    },
    {
      required: true,
      prop: 'key',
      readonly: true,
      label: 'File',
      type: 'media',
      cellParams: {
        useRowData: true
      },
      sort: true,
      search: true,
      override: {
        propertyCard: {
          col: 1,
          label: 'Thumbnail'
        }
      }
    },
    {
      prop: 'extension',
      label: 'Extension',
      type: 'text',
      readonly: true,
      cellTemplate: 'module/media/FileExtension',
      cellWidth: 50,
      sort: true,
      search: true,
      override: {
        propertyCard: {
          col: 1
        }
      }
    },
    {
      prop: 'size',
      label: 'Size',
      type: 'text',
      cellTemplate: 'module/media/FileSize',
      cellWidth: 60,
      sort: true,
      search: true,
      readonly: true,
      override: {
        propertyCard: {
          col: 2
        }
      }
    },
    {
      prop: 'id',
      readonly: true,
      label: 'Copy',
      type: 'text',
      cellTemplate: 'type/text/TextMediaCopyUrl',
      cellWidth: 150,
      sort: true,
      search: true,
      override: {
        propertyCard: {
          col: 3
        }
      }
    },
    {
      prop: 'created_at',
      label: 'Created at',
      type: 'date_time',
      cellTemplate: 'type/date_time/DateTimeReadable',
      cellWidth: 120,
      readonly: true,
      sort: true,
      search: true
    }
  ]
};
