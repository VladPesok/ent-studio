import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      'common': {
        'save': 'Save',
        'cancel': 'Cancel',
        'add': 'Add',
        'delete': 'Delete',
        'edit': 'Edit',
        'rename': 'Rename',
        'restore': 'Restore',
        'open': 'Open',
        'select': 'Select',
        'clear': 'Clear',
        'create': 'Create',
        'close': 'Close',
        'loading': 'Loading...',
        'saved': 'Saved',
        'deleted': 'Deleted',
        'restored': 'Restored',
        'archived': 'Archived',
        'added': 'Added',
        'error': 'Error',
        'currentPath': 'Current path:',
        'note': 'Note:',
        'pagination': {
          'showTotal': '{{start}}-{{end}} of {{total}} records'
        }
      },
      // Sider navigation
      'sider': {
        'patients': 'Patients',
        'testConstructor': 'Test Constructor',
        'dictionaries': 'Dictionaries',
        'settings': 'Settings'
      },
      // Patients list page
      'patientsList': {
        'title': 'Patients',
        'searchPlaceholder': 'Search by name/surname...',
        'addCard': 'Add card',
        'importFromFolder': 'Import from folder',
        'openFolder': 'Open folder',
        'columns': {
          'name': 'Surname and name',
          'birthdate': 'Birth date',
          'lastAppointment': 'Last appointment date',
          'doctor': 'Primary doctor',
          'diagnosis': 'Primary diagnosis',
          'status': 'Status'
        },
        'filters': {
          'search': 'Search',
          'reset': 'Reset',
          'filter': 'Filter',
          'fromDate': 'From date',
          'toDate': 'To date',
          'selectOptions': 'Select options',
          'selectStatus': 'Select status',
          'clearFilters': 'Clear filters',
          'activeFilters': 'Active filters:',
          'searchFor': 'Search for {{placeholder}}'
        },
        'activeFilterLabels': {
          'search': 'Search:',
          'name': 'Name:',
          'birthdate': 'Birth date',
          'appointmentDate': 'Appointment date',
          'doctors': 'Doctors:',
          'diagnosis': 'Diagnosis:',
          'status': 'Status:'
        },
        'messages': {
          'statusUpdated': 'Patient status updated',
          'statusUpdateError': 'Status update error',
          'importSuccess': 'Materials imported successfully',
          'noDataToImport': 'No new data found for import',
          'importError': 'Error importing data'
        },
        'import': {
          'title': 'Data import',
          'processingFolder': 'Processing folder {{current}} of {{total}}',
          'preparing': 'Preparing for import...',
          'largeFilesNote': 'This may take some time for large files'
        },
        'emptyText': 'No patients added yet'
      },
      // Settings page
      'settings': {
        'title': 'Settings',
        // Tabs Manager
        'tabs': {
          'title': 'Display Tabs',
          'addTab': 'Add tab',
          'addTabModal': 'Add tab',
          'renameTab': 'Rename tab',
          'tabName': 'Tab name',
          'emptyTabs': 'No tabs',
          'defaultTab': 'Default tab',
          'dragHint': 'Drag tabs to reorder. Hidden tabs are not displayed in patient card.',
          'messages': {
            'tabRenamed': 'Tab renamed',
            'tabAdded': 'Tab added',
            'tabExists': 'Tab with this name already exists',
            'loadError': 'Error loading tabs',
            'visibilityError': 'Error changing visibility',
            'reorderError': 'Error reordering',
            'renameError': 'Error renaming',
            'addError': 'Error adding tab'
          }
        },
        // Praat integration
        'praat': {
          'title': 'Praat Integration',
          'pathLabel': 'Path to Praat executable',
          'pathHelp': 'Select praat.exe to open audio files in Praat. If not configured, the "Open in Praat" button will not be displayed.',
          'pathPlaceholder': 'Path to praat.exe not selected...',
          'messages': {
            'pathSaved': 'Praat path saved successfully',
            'pathCleared': 'Praat path cleared',
            'pathSelectError': 'Error selecting Praat path',
            'pathClearError': 'Error clearing Praat path'
          }
        },
        // Patient Cards
        'patientCards': {
          'title': 'Patient Cards',
          'description': 'Import patient card template documents (DOC, DOCX, RTF files) for future use',
          'importCard': 'Import card',
          'defaultCard': 'Default patient card',
          'defaultCardHelp': 'Card that will be used by default. If not selected, the first card will be used.',
          'defaultCardPlaceholder': 'Select default card...',
          'noCards': 'No imported cards',
          'defaultLabel': 'Default',
          'importModal': {
            'title': 'Import patient card',
            'cardName': 'Card name',
            'cardNameHelp': 'If not specified, file name will be used',
            'cardNamePlaceholder': 'Enter card name...',
            'fileLabel': 'Document file',
            'fileRequired': 'Please select a file!',
            'selectFile': 'Select file (DOC, DOCX, RTF)',
            'fileTypeError': 'Only DOC, DOCX or RTF files can be uploaded!',
            'selectFileError': 'Please select a file',
            'invalidNameError': 'Card name contains invalid characters'
          },
          'deleteConfirm': {
            'title': 'Delete card?',
            'description': 'This action is irreversible. The card will be deleted permanently.'
          },
          'messages': {
            'importSuccess': 'Patient card imported successfully',
            'importError': 'Error importing patient card',
            'defaultChanged': 'Default card changed',
            'defaultChangeError': 'Error changing default card',
            'deleteSuccess': 'Patient card deleted',
            'deleteError': 'Error deleting patient card',
            'openError': 'Error opening file'
          }
        },
        // Storage Locations
        'storage': {
          'title': 'Patient Data Locations',
          'addFolder': 'Add folder',
          'openInExplorer': 'Open in explorer',
          'activate': 'Activate',
          'makeActive': 'Make active',
          'emptyLocations': 'No configured locations',
          'hint': 'New patients will be created in the active folder. Existing patients will remain in their folders.',
          'columns': {
            'path': 'Path',
            'patientCount': 'Patients',
            'size': 'Size',
            'status': 'Status',
            'actions': 'Actions'
          },
          'statuses': {
            'active': 'Active',
            'inactive': 'Inactive'
          },
          'messages': {
            'folderAdded': 'Folder added',
            'folderAddError': 'Error adding folder',
            'activeFolderChanged': 'Active folder changed',
            'activeFolderError': 'Error changing active folder',
            'loadError': 'Error loading locations',
            'openFolderError': 'Error opening folder'
          }
        },
        // Updates
        'updates': {
          'title': 'App Updates',
          'currentVersion': 'Current version:',
          'availableVersion': 'Available version:',
          'checkUpdates': 'Check for updates',
          'downloadUpdate': 'Download update',
          'installRestart': 'Install and restart',
          'messages': {
            'updateAvailable': 'Update available!',
            'upToDate': 'You are using the latest version',
            'checkError': 'Error checking for updates',
            'downloadError': 'Error downloading update',
            'installError': 'Error installing update',
            'downloaded': 'Update downloaded! Click "Install and restart" to complete.',
            'updateError': 'Update error: {{message}}'
          }
        }
      },
      // Dictionaries page
      'dictionaries': {
        'title': 'Dictionaries',
        'tabs': {
          'doctors': 'Doctors',
          'diagnoses': 'Diagnoses',
          'statuses': 'Patient Statuses'
        },
        'addButtons': {
          'doctor': 'Add doctor',
          'diagnosis': 'Add diagnosis',
          'status': 'Add status'
        },
        'modals': {
          'addDoctor': 'Add doctor',
          'addDiagnosis': 'Add diagnosis',
          'addStatus': 'Add status',
          'editDoctor': 'Edit doctor',
          'editDiagnosis': 'Edit diagnosis',
          'editStatus': 'Edit status'
        },
        'placeholders': {
          'enterName': 'Enter name',
          'enterDoctorName': "Enter doctor's name",
          'enterDiagnosisName': 'Enter diagnosis name',
          'enterStatusName': 'Enter status name'
        },
        'columns': {
          'name': 'Name',
          'createdAt': 'Created',
          'updatedAt': 'Updated',
          'status': 'Status',
          'actions': 'Actions',
          'isDefault': 'Default'
        },
        'statuses': {
          'active': 'Active',
          'deleted': 'Deleted',
          'archived': 'Archived'
        },
        'filters': {
          'active': 'Active',
          'deleted': 'Deleted',
          'archived': 'Archived'
        },
        'tooltips': {
          'edit': 'Edit',
          'delete': 'Delete',
          'restore': 'Restore',
          'archive': 'Archive',
          'cannotArchiveDefault': 'Default status cannot be archived'
        },
        'messages': {
          'loadError': 'Error loading dictionaries',
          'saveSuccess': 'Saved',
          'saveError': 'Error saving',
          'deleteSuccess': 'Deleted',
          'deleteError': 'Error deleting',
          'restoreSuccess': 'Restored',
          'restoreError': 'Error restoring',
          'archiveSuccess': 'Archived',
          'archiveError': 'Error archiving',
          'cannotArchiveDefault': 'Default status cannot be archived',
          'saveStatusError': 'Failed to save status',
          'archiveStatusError': 'Failed to archive status',
          'restoreStatusError': 'Failed to restore status',
          'defaultUpdated': 'Default status updated',
          'defaultUpdateError': 'Failed to set default status',
          'updateError': 'Update error'
        }
      },
      // Test types
      'testTypes': {
        'handicapIndex': 'Handicap Index Test'
      },
      // Test Constructor
      'testConstructor': {
        'title': 'Test Constructor',
        'createTest': 'Create test',
        'importTest': 'Import test',
        'exportTest': 'Export test',
        'showArchive': 'Show archive',
        'loadingTests': 'Loading tests...',
        'emptyTitle': 'No tests created',
        'emptyDescription': 'Create your first medical test',
        'archiveEmptyTitle': 'Archive is empty',
        'archiveEmptyDescription': 'No archived tests',
        'updated': 'Updated:',
        'created': 'Created:',
        'archived': 'Archived:',
        'type': 'Type:',
        'questions': 'Questions:',
        'diagnoses': 'Diagnoses:',
        'tooltips': {
          'edit': 'Edit',
          'archive': 'To archive',
          'restore': 'Restore'
        },
        'messages': {
          'loadError': 'Error loading tests',
          'archivedSuccess': 'Test moved to archive',
          'archiveError': 'Error archiving test',
          'restoredSuccess': 'Test restored from archive',
          'restoreError': 'Error restoring test',
          'importSuccess': 'Test "{{name}}" imported successfully',
          'importError': 'Import error: {{error}}',
          'importFailed': 'Error importing test',
          'exportSuccess': 'Test "{{name}}" exported successfully',
          'exportError': 'Export error: {{error}}',
          'exportFailed': 'Error exporting test',
          'folderOpenError': 'Error opening folder: {{error}}',
          'folderOpenFailed': 'Error opening tests folder'
        },
        // Test Editor
        'editor': {
          'backToList': 'Back to list',
          'saveTest': 'Save test',
          'updateTest': 'Update test',
          'basicInfo': 'Basic information',
          'testType': 'Test type',
          'selectTestType': 'Select test type',
          'testName': 'Test name',
          'enterTestName': 'Enter test name',
          'testDescription': 'Test description',
          'enterTestDescription': 'Enter test description',
          'unsavedChanges': 'Unsaved changes',
          'unsavedChangesMessage': 'You have unsaved changes. Are you sure you want to exit?',
          'yesExit': 'Yes, exit',
          'checkRequiredFields': "Check all required fields",
          'messages': {
            'testUpdated': 'Test updated successfully',
            'testCreated': 'Test created successfully',
            'saveError': 'Error saving test'
          }
        },
        // Test Types Wrapper
        'selectTestTypeHint': 'Select a test type to configure',
        // Handicap Index
        'handicapIndex': {
          'answerOptions': 'Answer options',
          'addOption': 'Add option',
          'resetToDefault': 'Reset to default',
          'answerOptionsDescription': 'Configure answer options that will be available for all questions of this test.',
          'points': 'Points',
          'answerText': 'Answer text',
          'deleteOptionConfirm': 'Delete this answer option?',
          'yes': 'Yes',
          'no': 'No',
          'cannotDeleteLast': 'Cannot delete last option',
          'deleteOption': 'Delete option',
          'addAnswerOption': 'Add answer option',
          'questions': 'Questions',
          'addQuestion': 'Add question',
          'addFirstQuestion': 'Add first question',
          'diagnosisRanges': 'Diagnosis ranges',
          'addRange': 'Add range',
          'addFirstRange': 'Add first range',
          'maxPossibleScore': 'Maximum possible score:',
          'scoreCalculation': '({{questions}} questions × {{points}} points)',
          'questionN': 'Question {{n}}',
          'deleteQuestion': 'Delete question',
          'enterQuestionText': 'Enter question text...',
          'preview': 'Preview:',
          'questionTextWillBeDisplayed': 'Question text will be displayed here...',
          'point': 'point',
          'points_few': 'points',
          'points_many': 'points',
          'diagnosisRange': 'Diagnosis range',
          'deleteRange': 'Delete range',
          'diagnosis': 'Diagnosis:',
          'enterDiagnosis': 'Enter diagnosis...',
          'minScore': 'Min. score:',
          'maxScore': 'Max. score:',
          'rangeVisualization': 'Range visualization:',
          'pointsRange': 'points',
          'invalidScoreRange': 'Invalid score range',
          'validation': {
            'addAtLeastOneRange': 'Add at least one diagnosis range',
            'rangesCannotIntersect': 'Ranges cannot intersect',
            'rangesMustCoverMin': 'Ranges must cover minimum score ({{score}})',
            'rangesMustCoverMax': 'Ranges must cover maximum score ({{score}})',
            'addAtLeastOneQuestion': 'Add at least one question',
            'allQuestionsMustHaveText': 'All questions must have text'
          }
        }
      },
      // Patient Overview
      'patientOverview': {
        'birthDate': 'Date of Birth',
        'cardStatus': 'Card Status',
        'openPatientCard': 'Open patient card',
        'editPatient': 'Edit',
        'mergePatients': 'Merge patients',
        'primaryDoctor': 'Primary Doctor',
        'selectOrAddDoctor': 'Select or add doctor...',
        'primaryDiagnosis': 'Primary Diagnosis',
        'selectOrAddDiagnosis': 'Select or add diagnosis...',
        'appointmentsList': 'Appointments List',
        'createNewAppointment': 'Create new appointment',
        'noAppointments': 'No appointments',
        'appointment': 'Appointment',
        'doctorsAtAppointment': 'Doctors at appointment',
        'diagnosisAtAppointment': 'Diagnosis at appointment date',
        'notes': 'Notes',
        'notesPlaceholder': 'Appointment notes...',
        'messages': {
          'appointmentCreated': 'Appointment created successfully',
          'appointmentCreateError': 'Failed to create appointment',
          'patientCardNotFound': 'Patient card not found',
          'failedToOpenCard': 'Failed to open patient card',
          'openedFolderFallback': 'Could not open file, opened patient folder',
          'statusUpdated': 'Status updated',
          'statusUpdateError': 'Error updating status',
          'patientRenamed': 'Patient renamed',
          'renameError': 'Error renaming'
        },
        'renameModal': {
          'title': 'Rename patient',
          'surname': 'Surname',
          'name': 'Name',
          'birthdate': 'Date of Birth',
          'selectDate': 'Select date',
          'allFieldsRequired': 'All fields are required',
          'patientExists': 'Patient with this name already exists'
        },
        'mergeModal': {
          'title': 'Merge patient cards',
          'description': 'Select a patient card to merge with the current one. All appointments and files from the selected card will be transferred to the current card, after which the selected card will be deleted.',
          'selectPatientPlaceholder': 'Select patient to merge...',
          'noPatients': 'No patients found',
          'confirm': 'Confirm',
          'confirmTitle': 'Confirm merge',
          'confirmMessage': 'Are you sure you want to merge card "{{patientName}}" with the current card?',
          'confirmWarning': 'This action is irreversible! The selected card will be deleted, and all its appointments and files will be transferred to the current card.',
          'yesMerge': 'Yes, merge',
          'messages': {
            'loadError': 'Error loading patient list',
            'mergeSuccess': 'Patient cards merged successfully',
            'mergeError': 'Error merging cards'
          }
        },
        'addAppointmentModal': {
          'title': 'New appointment',
          'appointmentDate': 'Appointment Date',
          'selectAppointmentDate': 'Select appointment date',
          'invalidDateFormat': 'Invalid date format',
          'medicalInfo': 'Medical Information',
          'doctorsAtAppointment': 'Doctors at appointment',
          'selectOrEnterDoctor': 'Select or enter doctor',
          'diagnosisAtDate': 'Diagnosis at appointment date',
          'selectOrEnterDiagnosis': 'Select or enter diagnosis',
          'additionalInfo': 'Additional Information',
          'optional': '(optional)',
          'notesLabel': 'Notes',
          'additionalNotes': 'Additional appointment notes'
        }
      },
      // Video Gallery
      'videoGallery': {
        'loadingVideos': 'Loading videos...',
        'noVideos': 'No video files',
        'addVideosHint': 'Add video files to this appointment',
        'addVideoFiles': 'Add video files',
        'openFolder': 'Open folder',
        'videoMaterials': 'Video materials',
        'addFiles': 'Add files',
        'video': 'Video',
        'videoWithAudio': 'Video + Audio',
        'loadMore': 'Load more ({{remaining}} remaining)',
        'loading': 'Loading...'
      },
      // Audio Gallery
      'audioGallery': {
        'loadingFiles': 'Loading files...',
        'noFiles': 'No files',
        'addFilesHint': 'Add files to this appointment',
        'recordAudio': 'Record audio',
        'addFiles': 'Add files',
        'openFolder': 'Open folder',
        'materials': 'Materials',
        'openInPraat': 'Open in Praat',
        'fileOpened': 'File {{fileName}} opened',
        'fileOpenError': 'Error opening file',
        'praatNotConfigured': 'Praat path not configured. Go to settings to configure.',
        'openedInPraat': 'File {{fileName}} opened in Praat',
        'praatError': 'Error opening file in Praat'
      },
      // Record Audio Modal
      'recordAudioModal': {
        'title': 'Record Audio',
        'microphone': 'Microphone:',
        'selectMicrophone': 'Select microphone',
        'filename': 'Filename:',
        'enterFilename': 'Enter filename',
        'recording': 'RECORDING',
        'paused': 'PAUSED',
        'startRecording': 'Start Recording',
        'resume': 'Resume',
        'pause': 'Pause',
        'stop': 'Stop',
        'recordingPreview': 'Recording Preview:',
        'saveRecording': 'Save Recording',
        'messages': {
          'loadDevicesError': 'Failed to load audio devices',
          'startError': 'Failed to start recording. Please check microphone permissions.',
          'filenameRequired': 'Please provide a filename for the recording',
          'saveError': 'Failed to save recording'
        }
      },
      // Custom Tab
      'customTab': {
        'loadingFiles': 'Loading files...',
        'noFiles': 'No files',
        'addFilesHint': 'Add files to folder "{{tabName}}"',
        'addFiles': 'Add files',
        'openFolder': 'Open folder',
        'messages': {
          'filesAdded': 'Added {{count}} file(s)',
          'addError': 'Error adding files',
          'folderError': 'Error opening folder',
          'fileError': 'Error opening file'
        }
      },
      // Test Tab
      'testTab': {
        'loadingTests': 'Loading tests...',
        'noTests': 'No tests',
        'addTestHint': 'Add a test for the patient to take',
        'selectTestPlaceholder': 'Select a test to add...',
        'addTest': 'Add test',
        'noAvailableTests': 'No available tests. Create tests in the test constructor.',
        'tests': 'Tests',
        'completed': 'Completed',
        'inProgress': 'In progress',
        'notStarted': 'Not started',
        'view': 'View',
        'takeTest': 'Take test',
        'takeAgain': 'Take again',
        'added': 'Added:',
        'completedAt': 'Completed:',
        'progress': 'Progress: {{answered}} of {{total}} questions',
        'result': 'Result:',
        'deleteConfirm': {
          'title': 'Delete test?',
          'message': 'Are you sure you want to delete this test? All data will be lost.'
        },
        'messages': {
          'loadError': 'Error loading tests',
          'selectTest': 'Please select a test to add',
          'testNotFound': 'Selected test not found',
          'testAlreadyAdded': 'This test has already been added to the current appointment',
          'testAdded': 'Test added successfully',
          'addError': 'Error adding test',
          'testReset': 'Test reset. You can take it again.',
          'resetError': 'Error restarting test',
          'testCompleted': 'Test completed successfully!',
          'deleteSuccess': 'Test deleted',
          'deleteError': 'Error deleting test'
        }
      },
      // Test Taker
      'testTaker': {
        'testResults': 'Test results',
        'takingTest': 'Taking test',
        'testCompleted': 'Test completed!',
        'totalScore': 'Total score:',
        'diagnosis': 'Diagnosis:',
        'completedAt': 'Completed:',
        'takeTestAgain': 'Take test again',
        'unsupportedTestType': 'Unsupported test type: {{type}}',
        'question': 'Question {{current}} of {{total}}',
        'previous': 'Previous',
        'next': 'Next',
        'finishTest': 'Finish test',
        'messages': {
          'selectAnswer': 'Please select an answer',
          'saveError': 'Error saving answer',
          'completeError': 'Error completing test'
        }
      }
    }
  },
  ua: {
    translation: {
      // Common
      'common': {
        'save': 'Зберегти',
        'cancel': 'Скасувати',
        'add': 'Додати',
        'delete': 'Видалити',
        'edit': 'Редагувати',
        'rename': 'Перейменувати',
        'restore': 'Відновити',
        'open': 'Відкрити',
        'select': 'Обрати',
        'clear': 'Очистити',
        'create': 'Створити',
        'close': 'Закрити',
        'loading': 'Завантаження...',
        'saved': 'Збережено',
        'deleted': 'Видалено',
        'restored': 'Відновлено',
        'archived': 'Архівовано',
        'added': 'Додано',
        'error': 'Помилка',
        'currentPath': 'Поточний шлях:',
        'note': 'Примітка:',
        'pagination': {
          'showTotal': '{{start}}-{{end}} з {{total}} записів'
        }
      },
      // Sider navigation
      'sider': {
        'patients': 'Пацієнти',
        'testConstructor': 'Конструктор тестів',
        'dictionaries': 'Словники',
        'settings': 'Налаштування'
      },
      // Patients list page
      'patientsList': {
        'title': 'Пацієнти',
        'searchPlaceholder': 'Пошук за іменем/прізвищем…',
        'addCard': 'Додати картку',
        'importFromFolder': 'Імпорт з папки',
        'openFolder': 'Відкрити папку',
        'columns': {
          'name': "Прізвище та ім'я",
          'birthdate': 'Дата народження',
          'lastAppointment': 'Дата останнього прийому',
          'doctor': 'Ведучий лікар',
          'diagnosis': 'Основний діагноз',
          'status': 'Статус'
        },
        'filters': {
          'search': 'Пошук',
          'reset': 'Скинути',
          'filter': 'Фільтр',
          'fromDate': 'Від дати',
          'toDate': 'До дати',
          'selectOptions': 'Оберіть варіанти',
          'selectStatus': 'Оберіть статус',
          'clearFilters': 'Очистити фільтри',
          'activeFilters': 'Активні фільтри:',
          'searchFor': 'Пошук {{placeholder}}'
        },
        'activeFilterLabels': {
          'search': 'Пошук:',
          'name': "Ім'я:",
          'birthdate': 'Дата народження',
          'appointmentDate': 'Дата прийому',
          'doctors': 'Лікарі:',
          'diagnosis': 'Діагноз:',
          'status': 'Статус:'
        },
        'messages': {
          'statusUpdated': 'Статус пацієнта оновлено',
          'statusUpdateError': 'Помилка оновлення статусу',
          'importSuccess': 'Успішно імпортовано матеріали',
          'noDataToImport': 'Не знайдено нових даних для імпорту',
          'importError': 'Помилка при імпорті даних'
        },
        'import': {
          'title': 'Імпорт даних',
          'processingFolder': 'Обробка папки {{current}} з {{total}}',
          'preparing': 'Підготовка до імпорту...',
          'largeFilesNote': 'Це може зайняти деякий час для великих файлів'
        },
        'emptyText': 'Поки немає доданих пацієнтів'
      },
      // Settings page
      'settings': {
        'title': 'Налаштування',
        // Tabs Manager
        'tabs': {
          'title': 'Відображувані вкладки',
          'addTab': 'Додати вкладку',
          'addTabModal': 'Додати вкладку',
          'renameTab': 'Перейменувати вкладку',
          'tabName': 'Назва вкладки',
          'emptyTabs': 'Немає вкладок',
          'defaultTab': 'Стандартна вкладка',
          'dragHint': 'Перетягуйте вкладки для зміни порядку. Приховані вкладки не відображаються у картці пацієнта.',
          'messages': {
            'tabRenamed': 'Вкладку перейменовано',
            'tabAdded': 'Вкладку додано',
            'tabExists': 'Вкладка з такою назвою вже існує',
            'loadError': 'Помилка завантаження вкладок',
            'visibilityError': 'Помилка зміни видимості',
            'reorderError': 'Помилка зміни порядку',
            'renameError': 'Помилка перейменування',
            'addError': 'Помилка додавання вкладки'
          }
        },
        // Praat integration
        'praat': {
          'title': 'Інтеграція з Praat',
          'pathLabel': 'Шлях до виконуваного файлу Praat',
          'pathHelp': "Оберіть praat.exe для відкриття аудіо файлів у Praat. Якщо не налаштовано, кнопка 'Відкрити в Praat' не буде відображатися.",
          'pathPlaceholder': 'Шлях до praat.exe не обрано...',
          'messages': {
            'pathSaved': 'Шлях до Praat успішно збережено',
            'pathCleared': 'Шлях до Praat очищено',
            'pathSelectError': 'Помилка при виборі шляху до Praat',
            'pathClearError': 'Помилка при очищенні шляху до Praat'
          }
        },
        // Patient Cards
        'patientCards': {
          'title': 'Картки пацієнтів',
          'description': 'Імпортуйте документи-шаблони карток пацієнтів (DOC, DOCX, RTF файли) для подальшого використання',
          'importCard': 'Імпортувати картку',
          'defaultCard': 'Картка пацієнта за замовчуванням',
          'defaultCardHelp': 'Картка, яка буде використовуватися за замовчуванням. Якщо не обрано, використовується перша картка.',
          'defaultCardPlaceholder': 'Оберіть картку за замовчуванням...',
          'noCards': 'Немає імпортованих карток',
          'defaultLabel': 'За замовчуванням',
          'importModal': {
            'title': 'Імпорт картки пацієнта',
            'cardName': 'Назва картки',
            'cardNameHelp': 'Якщо не вказано, буде використано назву файлу',
            'cardNamePlaceholder': 'Введіть назву картки...',
            'fileLabel': 'Файл документа',
            'fileRequired': 'Будь ласка, оберіть файл!',
            'selectFile': 'Обрати файл (DOC, DOCX, RTF)',
            'fileTypeError': 'Можна завантажувати тільки файли DOC, DOCX або RTF!',
            'selectFileError': 'Будь ласка, оберіть файл',
            'invalidNameError': 'Назва картки містить недопустимі символи'
          },
          'deleteConfirm': {
            'title': 'Видалити картку?',
            'description': 'Ця дія незворотна. Картку буде видалено назавжди.'
          },
          'messages': {
            'importSuccess': 'Картку пацієнта успішно імпортовано',
            'importError': 'Помилка імпорту картки пацієнта',
            'defaultChanged': 'Картку за замовчуванням змінено',
            'defaultChangeError': 'Помилка зміни картки за замовчуванням',
            'deleteSuccess': 'Картку пацієнта видалено',
            'deleteError': 'Помилка видалення картки пацієнта',
            'openError': 'Помилка відкриття файлу'
          }
        },
        // Storage Locations
        'storage': {
          'title': 'Розташування даних пацієнтів',
          'addFolder': 'Додати папку',
          'openInExplorer': 'Відкрити в провіднику',
          'activate': 'Активувати',
          'makeActive': 'Зробити активною',
          'emptyLocations': 'Немає налаштованих розташувань',
          'hint': 'Нові пацієнти будуть створюватися в активній папці. Існуючі пацієнти залишаться у своїх папках.',
          'columns': {
            'path': 'Шлях',
            'patientCount': 'Пацієнтів',
            'size': 'Розмір',
            'status': 'Статус',
            'actions': 'Дії'
          },
          'statuses': {
            'active': 'Активна',
            'inactive': 'Неактивна'
          },
          'messages': {
            'folderAdded': 'Папку додано',
            'folderAddError': 'Помилка додавання папки',
            'activeFolderChanged': 'Активну папку змінено',
            'activeFolderError': 'Помилка зміни активної папки',
            'loadError': 'Помилка завантаження розташувань',
            'openFolderError': 'Помилка відкриття папки'
          }
        },
        // Updates
        'updates': {
          'title': 'Оновлення додатку',
          'currentVersion': 'Поточна версія:',
          'availableVersion': 'Доступна версія:',
          'checkUpdates': 'Перевірити оновлення',
          'downloadUpdate': 'Завантажити оновлення',
          'installRestart': 'Встановити та перезапустити',
          'messages': {
            'updateAvailable': 'Доступне оновлення!',
            'upToDate': 'Ви використовуєте останню версію',
            'checkError': 'Помилка при перевірці оновлень',
            'downloadError': 'Помилка при завантаженні оновлення',
            'installError': 'Помилка при встановленні оновлення',
            'downloaded': 'Оновлення завантажено! Натисніть "Встановити та перезапустити" для завершення.',
            'updateError': 'Помилка оновлення: {{message}}'
          }
        }
      },
      // Dictionaries page
      'dictionaries': {
        'title': 'Словники',
        'tabs': {
          'doctors': 'Лікарі',
          'diagnoses': 'Діагнози',
          'statuses': 'Статуси пацієнтів'
        },
        'addButtons': {
          'doctor': 'Додати лікаря',
          'diagnosis': 'Додати діагноз',
          'status': 'Додати статус'
        },
        'modals': {
          'addDoctor': 'Додати лікаря',
          'addDiagnosis': 'Додати діагноз',
          'addStatus': 'Додати статус',
          'editDoctor': 'Редагувати лікаря',
          'editDiagnosis': 'Редагувати діагноз',
          'editStatus': 'Редагувати статус'
        },
        'placeholders': {
          'enterName': 'Введіть назву',
          'enterDoctorName': "Введіть ім'я лікаря",
          'enterDiagnosisName': 'Введіть назву діагнозу',
          'enterStatusName': 'Введіть назву статусу'
        },
        'columns': {
          'name': 'Назва',
          'createdAt': 'Створено',
          'updatedAt': 'Оновлено',
          'status': 'Статус',
          'actions': 'Дії',
          'isDefault': 'За замовчуванням'
        },
        'statuses': {
          'active': 'Активний',
          'deleted': 'Видалений',
          'archived': 'Архівований'
        },
        'filters': {
          'active': 'Активний',
          'deleted': 'Видалений',
          'archived': 'Архівований'
        },
        'tooltips': {
          'edit': 'Редагувати',
          'delete': 'Видалити',
          'restore': 'Відновити',
          'archive': 'Архівувати',
          'cannotArchiveDefault': 'Статус за замовчуванням не можна архівувати'
        },
        'messages': {
          'loadError': 'Помилка завантаження словників',
          'saveSuccess': 'Збережено',
          'saveError': 'Помилка збереження',
          'deleteSuccess': 'Видалено',
          'deleteError': 'Помилка видалення',
          'restoreSuccess': 'Відновлено',
          'restoreError': 'Помилка відновлення',
          'archiveSuccess': 'Архівовано',
          'archiveError': 'Помилка архівування',
          'cannotArchiveDefault': 'Статус за замовчуванням не можна архівувати',
          'saveStatusError': 'Не вдалося зберегти статус',
          'archiveStatusError': 'Не вдалося архівувати статус',
          'restoreStatusError': 'Не вдалося відновити статус',
          'defaultUpdated': 'Статус за замовчуванням оновлено',
          'defaultUpdateError': 'Не вдалося встановити статус за замовчуванням',
          'updateError': 'Помилка оновлення'
        }
      },
      // Test types
      'testTypes': {
        'handicapIndex': 'Тест індексу обмежень'
      },
      // Test Constructor
      'testConstructor': {
        'title': 'Конструктор тестів',
        'createTest': 'Створити тест',
        'importTest': 'Імпортувати тест',
        'exportTest': 'Експортувати тест',
        'showArchive': 'Показати архів',
        'loadingTests': 'Завантаження тестів...',
        'emptyTitle': 'Немає створених тестів',
        'emptyDescription': 'Створіть свій перший медичний тест',
        'archiveEmptyTitle': 'Архів порожній',
        'archiveEmptyDescription': 'Немає архівованих тестів',
        'updated': 'Оновлено:',
        'created': 'Створено:',
        'archived': 'Архівовано:',
        'type': 'Тип:',
        'questions': 'Питань:',
        'diagnoses': 'Діагнозів:',
        'tooltips': {
          'edit': 'Редагувати',
          'archive': 'В архів',
          'restore': 'Відновити'
        },
        'messages': {
          'loadError': 'Помилка завантаження тестів',
          'archivedSuccess': 'Тест переміщено в архів',
          'archiveError': 'Помилка архівування тесту',
          'restoredSuccess': 'Тест відновлено з архіву',
          'restoreError': 'Помилка відновлення тесту',
          'importSuccess': 'Тест "{{name}}" імпортовано успішно',
          'importError': 'Помилка імпорту: {{error}}',
          'importFailed': 'Помилка імпорту тесту',
          'exportSuccess': 'Тест "{{name}}" експортовано успішно',
          'exportError': 'Помилка експорту: {{error}}',
          'exportFailed': 'Помилка експорту тесту',
          'folderOpenError': 'Помилка відкриття папки: {{error}}',
          'folderOpenFailed': 'Помилка відкриття папки тестів'
        },
        // Test Editor
        'editor': {
          'backToList': 'Назад до списку',
          'saveTest': 'Зберегти тест',
          'updateTest': 'Оновити тест',
          'basicInfo': 'Основна інформація',
          'testType': 'Тип тесту',
          'selectTestType': 'Оберіть тип тесту',
          'testName': 'Назва тесту',
          'enterTestName': 'Введіть назву тесту',
          'testDescription': 'Опис тесту',
          'enterTestDescription': 'Введіть опис тесту',
          'unsavedChanges': 'Незбережені зміни',
          'unsavedChangesMessage': 'У вас є незбережені зміни. Ви впевнені, що хочете вийти?',
          'yesExit': 'Так, вийти',
          'checkRequiredFields': "Перевірте всі обов'язкові поля",
          'messages': {
            'testUpdated': 'Тест оновлено успішно',
            'testCreated': 'Тест створено успішно',
            'saveError': 'Помилка збереження тесту'
          }
        },
        // Test Types Wrapper
        'selectTestTypeHint': 'Оберіть тип тесту для налаштування',
        // Handicap Index
        'handicapIndex': {
          'answerOptions': 'Варіанти відповідей',
          'addOption': 'Додати варіант',
          'resetToDefault': 'Скинути до стандартних',
          'answerOptionsDescription': 'Налаштуйте варіанти відповідей, які будуть доступні для всіх питань цього тесту.',
          'points': 'Бали',
          'answerText': 'Текст відповіді',
          'deleteOptionConfirm': 'Видалити цей варіант відповіді?',
          'yes': 'Так',
          'no': 'Ні',
          'cannotDeleteLast': 'Неможливо видалити останній варіант',
          'deleteOption': 'Видалити варіант',
          'addAnswerOption': 'Додати варіант відповіді',
          'questions': 'Питання',
          'addQuestion': 'Додати питання',
          'addFirstQuestion': 'Додати перше питання',
          'diagnosisRanges': 'Діапазони діагнозів',
          'addRange': 'Додати діапазон',
          'addFirstRange': 'Додати перший діапазон',
          'maxPossibleScore': 'Максимальний можливий бал:',
          'scoreCalculation': '({{questions}} питань × {{points}} балів)',
          'questionN': 'Питання {{n}}',
          'deleteQuestion': 'Видалити питання',
          'enterQuestionText': 'Введіть текст питання...',
          'preview': 'Попередній перегляд:',
          'questionTextWillBeDisplayed': 'Текст питання буде відображено тут...',
          'point': 'бал',
          'points_few': 'бали',
          'points_many': 'балів',
          'diagnosisRange': 'Діапазон діагнозу',
          'deleteRange': 'Видалити діапазон',
          'diagnosis': 'Діагноз:',
          'enterDiagnosis': 'Введіть діагноз...',
          'minScore': 'Мін. бал:',
          'maxScore': 'Макс. бал:',
          'rangeVisualization': 'Візуалізація діапазону:',
          'pointsRange': 'балів',
          'invalidScoreRange': 'Некоректний діапазон балів',
          'validation': {
            'addAtLeastOneRange': 'Додайте хоча б один діапазон діагнозу',
            'rangesCannotIntersect': 'Діапазони не можуть перетинатися',
            'rangesMustCoverMin': 'Діапазони повинні покривати мінімальний бал ({{score}})',
            'rangesMustCoverMax': 'Діапазони повинні покривати максимальний бал ({{score}})',
            'addAtLeastOneQuestion': 'Додайте хоча б одне питання',
            'allQuestionsMustHaveText': 'Всі питання повинні мати текст'
          }
        }
      },
      // Patient Overview
      'patientOverview': {
        'birthDate': 'Дата народження',
        'cardStatus': 'Статус картки',
        'openPatientCard': 'Відкрити картку пацієнта',
        'editPatient': 'Редагувати',
        'mergePatients': "Об'єднати пацієнтів",
        'primaryDoctor': 'Ведучий лікар',
        'selectOrAddDoctor': 'Обрати або додати лікаря...',
        'primaryDiagnosis': 'Основний діагноз',
        'selectOrAddDiagnosis': 'Обрати або додати діагноз...',
        'appointmentsList': 'Список прийомів',
        'createNewAppointment': 'Створити новий прийом',
        'noAppointments': 'Немає прийомів',
        'appointment': 'Прийом',
        'doctorsAtAppointment': 'Лікарі на прийомі',
        'diagnosisAtAppointment': 'Діагноз станом на дату прийому',
        'notes': 'Нотатки',
        'notesPlaceholder': 'Нотатки про прийом...',
        'messages': {
          'appointmentCreated': 'Прийом успішно створено',
          'appointmentCreateError': 'Не вдалося створити прийом',
          'patientCardNotFound': 'Картка пацієнта не знайдена',
          'failedToOpenCard': 'Не вдалося відкрити картку пацієнта',
          'openedFolderFallback': 'Не вдалося відкрити файл, відкрито папку пацієнта',
          'statusUpdated': 'Статус оновлено',
          'statusUpdateError': 'Помилка оновлення статусу',
          'patientRenamed': 'Пацієнта перейменовано',
          'renameError': 'Помилка перейменування'
        },
        'renameModal': {
          'title': 'Перейменувати пацієнта',
          'surname': 'Прізвище',
          'name': "Ім'я",
          'birthdate': 'Дата народження',
          'selectDate': 'Оберіть дату',
          'allFieldsRequired': "Всі поля обов'язкові",
          'patientExists': "Пацієнт з таким ім'ям вже існує"
        },
        'mergeModal': {
          'title': "Об'єднати картки пацієнтів",
          'description': "Оберіть картку пацієнта, яку потрібно об'єднати з поточною. Всі прийоми та файли з обраної картки будуть перенесені до поточної картки, після чого обрана картка буде видалена.",
          'selectPatientPlaceholder': "Оберіть пацієнта для об'єднання...",
          'noPatients': 'Пацієнтів не знайдено',
          'confirm': 'Підтвердити',
          'confirmTitle': "Підтвердження об'єднання",
          'confirmMessage': "Ви впевнені, що хочете об'єднати картку \"{{patientName}}\" з поточною карткою?",
          'confirmWarning': 'Ця дія незворотна! Обрана картка буде видалена, а всі її прийоми та файли будуть перенесені до поточної картки.',
          'yesMerge': "Так, об'єднати",
          'messages': {
            'loadError': 'Помилка завантаження списку пацієнтів',
            'mergeSuccess': "Картки пацієнтів успішно об'єднано",
            'mergeError': "Помилка об'єднання карток"
          }
        },
        'addAppointmentModal': {
          'title': 'Новий прийом',
          'appointmentDate': 'Дата прийому',
          'selectAppointmentDate': 'Оберіть дату прийому',
          'invalidDateFormat': 'Невірний формат дати',
          'medicalInfo': 'Медична інформація',
          'doctorsAtAppointment': 'Лікарі на прийомі',
          'selectOrEnterDoctor': 'Оберіть або введіть лікаря',
          'diagnosisAtDate': 'Діагноз станом на дату прийому',
          'selectOrEnterDiagnosis': 'Оберіть або введіть діагноз',
          'additionalInfo': 'Додаткова інформація',
          'optional': "(необов'язково)",
          'notesLabel': 'Примітки',
          'additionalNotes': 'Додаткові примітки до прийому'
        }
      },
      // Video Gallery
      'videoGallery': {
        'loadingVideos': 'Завантаження відео...',
        'noVideos': 'Немає відео файлів',
        'addVideosHint': 'Додайте відео файли до цього прийому',
        'addVideoFiles': 'Додати відео файли',
        'openFolder': 'Відкрити папку',
        'videoMaterials': 'Відео матеріали',
        'addFiles': 'Додати файли',
        'video': 'Відео',
        'videoWithAudio': 'Відео + Аудіо',
        'loadMore': 'Завантажити ще ({{remaining}} залишилось)',
        'loading': 'Завантаження...'
      },
      // Audio Gallery
      'audioGallery': {
        'loadingFiles': 'Завантаження файлів...',
        'noFiles': 'Немає файлів',
        'addFilesHint': 'Додайте файли до цього прийому',
        'recordAudio': 'Записати аудіо',
        'addFiles': 'Додати файли',
        'openFolder': 'Відкрити папку',
        'materials': 'Матеріали',
        'openInPraat': 'Відкрити в Praat',
        'fileOpened': 'Файл {{fileName}} відкрито',
        'fileOpenError': 'Помилка при відкритті файлу',
        'praatNotConfigured': 'Шлях до Praat не налаштовано. Перейдіть до налаштувань для конфігурації.',
        'openedInPraat': 'Файл {{fileName}} відкрито в Praat',
        'praatError': 'Помилка при відкритті файлу в Praat'
      },
      // Record Audio Modal
      'recordAudioModal': {
        'title': 'Запис аудіо',
        'microphone': 'Мікрофон:',
        'selectMicrophone': 'Оберіть мікрофон',
        'filename': "Ім'я файлу:",
        'enterFilename': "Введіть ім'я файлу",
        'recording': 'ЗАПИС',
        'paused': 'ПАУЗА',
        'startRecording': 'Почати запис',
        'resume': 'Продовжити',
        'pause': 'Пауза',
        'stop': 'Зупинити',
        'recordingPreview': 'Попередній перегляд:',
        'saveRecording': 'Зберегти запис',
        'messages': {
          'loadDevicesError': 'Помилка завантаження аудіо пристроїв',
          'startError': 'Помилка запуску запису. Перевірте дозволи на мікрофон.',
          'filenameRequired': "Будь ласка, введіть ім'я файлу для запису",
          'saveError': 'Помилка збереження запису'
        }
      },
      // Custom Tab
      'customTab': {
        'loadingFiles': 'Завантаження файлів...',
        'noFiles': 'Немає файлів',
        'addFilesHint': 'Додайте файли до папки "{{tabName}}"',
        'addFiles': 'Додати файли',
        'openFolder': 'Відкрити папку',
        'messages': {
          'filesAdded': 'Додано {{count}} файл(ів)',
          'addError': 'Помилка додавання файлів',
          'folderError': 'Помилка відкриття папки',
          'fileError': 'Помилка відкриття файлу'
        }
      },
      // Test Tab
      'testTab': {
        'loadingTests': 'Завантаження тестів...',
        'noTests': 'Немає тестів',
        'addTestHint': 'Додайте тест для проходження пацієнтом',
        'selectTestPlaceholder': 'Оберіть тест для додавання...',
        'addTest': 'Додати тест',
        'noAvailableTests': 'Немає доступних тестів. Створіть тести в конструкторі тестів.',
        'tests': 'Тести',
        'completed': 'Завершено',
        'inProgress': 'В процесі',
        'notStarted': 'Не розпочато',
        'view': 'Переглянути',
        'takeTest': 'Пройти тест',
        'takeAgain': 'Пройти знову',
        'added': 'Додано:',
        'completedAt': 'Завершено:',
        'progress': 'Прогрес: {{answered}} з {{total}} питань',
        'result': 'Результат:',
        'deleteConfirm': {
          'title': 'Видалити тест?',
          'message': 'Ви впевнені, що хочете видалити цей тест? Всі дані будуть втрачені.'
        },
        'messages': {
          'loadError': 'Помилка завантаження тестів',
          'selectTest': 'Будь ласка, оберіть тест для додавання',
          'testNotFound': 'Обраний тест не знайдено',
          'testAlreadyAdded': 'Цей тест вже додано до поточного прийому',
          'testAdded': 'Тест успішно додано',
          'addError': 'Помилка додавання тесту',
          'testReset': 'Тест скинуто. Можна проходити знову.',
          'resetError': 'Помилка перезапуску тесту',
          'testCompleted': 'Тест успішно завершено!',
          'deleteSuccess': 'Тест видалено',
          'deleteError': 'Помилка видалення тесту'
        }
      },
      // Test Taker
      'testTaker': {
        'testResults': 'Результати тесту',
        'takingTest': 'Проходження тесту',
        'testCompleted': 'Тест завершено!',
        'totalScore': 'Загальний бал:',
        'diagnosis': 'Діагноз:',
        'completedAt': 'Завершено:',
        'takeTestAgain': 'Пройти тест знову',
        'unsupportedTestType': 'Непідтримуваний тип тесту: {{type}}',
        'question': 'Питання {{current}} з {{total}}',
        'previous': 'Попереднє',
        'next': 'Наступне',
        'finishTest': 'Завершити тест',
        'messages': {
          'selectAnswer': 'Будь ласка, оберіть відповідь',
          'saveError': 'Помилка збереження відповіді',
          'completeError': 'Помилка завершення тесту'
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ua',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
