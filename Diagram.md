flowchart TB
    subgraph client["Frontend (Next.js)"]
        UI["Giao diện người dùng"]
        APIService["API Service"]
        Router["Next Router"]
        ApiKeyAuth["Xác thực API Key"]
    end
    
    subgraph server["Backend (NestJS)"]
        Express["Express API"]
        MongoDB[(MongoDB)]
        AMI["Asterisk Manager\nInterface"]
        Config["Xử lý cấu hình Asterisk"]
        ApiKeyGuard["API Key Guard"]
    end
    
    subgraph crm["External CRM"]
        ApiKeyValidation["API Key Validation"]
    end
    
    subgraph asterisk["Asterisk PBX"]
        AsteriskCore["Asterisk Core"]
        ConfigFiles["Tệp Cấu hình"]
        AMIAPI["AMI API"]
    end
    
    UI --> Router
    UI --> APIService
    APIService --> ApiKeyAuth
    ApiKeyAuth --> Express
    
    Express --> ApiKeyGuard
    ApiKeyGuard --> ApiKeyValidation
    
    Express --> MongoDB
    Express --> AMI
    Express --> Config
    
    AMI --> AMIAPI
    Config --> ConfigFiles
    AMIAPI --> AsteriskCore
    ConfigFiles --> AsteriskCore
    
    subgraph endpoints["API Endpoints"]
        direction LR
        Extensions["Extensions"]
        Trunks["Trunks"]
        Queues["Queues"]
        Routes["Routes"]
        CDR["CDR"]
        System["System"]
    end
    
    ApiKeyGuard --> endpoints
    
    subgraph frontend["React Components"]
        direction LR
        Dashboard["Dashboard"]
        ExtensionsMgmt["Extensions\nManagement"]
        TrunksMgmt["Trunks\nManagement"]
        QueuesMgmt["Queues\nManagement"]
        RoutesMgmt["Routes\nManagement"]
        CDRView["CDR Viewer"]
        SystemMgmt["System\nManagement"]
    end
    
    UI --> frontend
    
    %% Liên kết giữa Frontend và Backend
    ExtensionsMgmt -.-> Extensions
    TrunksMgmt -.-> Trunks
    QueuesMgmt -.-> Queues
    RoutesMgmt -.-> Routes
    CDRView -.-> CDR
    SystemMgmt -.-> System
    Dashboard -.-> System