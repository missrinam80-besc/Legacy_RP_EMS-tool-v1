Config = Config or {}

-- DAMAGE SYSTEM
Config.Framework = 'qb' -- Set this to your framework. 'qb' or 'esx'
Config.b2060 = true -- Set this to true if you are using server version 2060 or above, otherwise set it to false
Config.b2545 = true -- Set this to true if you are using server version 2545 or above, otherwise set it to false
Config.startDamageTimer = 5000 -- Time in ms before the player damages gets applied when loading the chracters
Config.UseRadialProgressBar = true -- Use the radial progress bar instead of the default one
Config.UseOxNotif = true -- Set this to false if you want to use the default framework notificatins
Config.UsedInventory = 'ox' -- qb, esx, ox, chezza, qs, codem, origen or empty(will use default inventory for that framework)
Config.NewQbInventory = false

Config.UseTarget = true -- Set to false if you don't want to use targetting at all and instead use drawtext
Config.UseOxTarget = true -- Set to false if you don't want to use ox_target
Config.TargetName = 'ox-target' -- The name of the target resource (only needed if you use qb-target or qtarget)
Config.Dispatch = 'other' -- Usable dispatch inputs: 'default', 'ps', 'other'
Config.DispatchNotifyButton = 47
Config.UseXsound = true -- If set to false you'll use native audio, which is to be recommended to everyone who's got it working. 
Config.FFA = '' -- All pre-integrated ffa/paintaball scripts. Valid args: nass

Config.OpenKey = 'j' -- The default key to open the damage menu
Config.SkellyKey = 'i' -- The default key to open the skelly overview
Config.EditSkellyKey = '' -- Key or ''
Config.MedicalMenuMaxDistance = 10.0 -- Max distance a player can use the medical menu on another player 

Config.ServerDelay = 100 -- How many ms the server is behind by. Recommended to keep above 100ms. Should say in your server console by how far behind your server is.
Config.Debug = false -- Enable or disable debug mode to investigate issues with the script

Config.UseRoomLoad = false -- let us know if toggling this breaks/fixes screens

Config.CustomDeathScreen = false -- Enable of disable a customised death timer screen, keep at false if you don't know what you are doing
Config.PopUpSkelly = false

-- don't edit AmbulanceJobs! Enter your jobs in Config.Hospitals!
Config.AmbulanceJobs = {}

Config.InteractionDict = 'anim@heists@narcotics@funding@gang_idle'
Config.InteractionAnim = 'gang_chatting_idle01'

Config.JobBlips = true -- Whether or not ambulance personel can see eachother on the map.
Config.MinimalDoctors = 1 -- How many players with the ambulance job to prevent the hospital check-in system from being used
Config.DocCooldown = 2 -- Cooldown between doctor calls allowed, in minutes
Config.AIHealTimer = 30 -- How long it will take to be healed after checking in, in seconds
Config.WipeInventoryOnRespawn = true -- Enable or disable removing all the players items when they respawn at the hospital
Config.ExcludeItems = {'iphone', 'phone'}
Config.Helicopter = "swifthp" -- Helicopter model that players with the ambulance job can use
Config.LastStandTime = 300 -- How long before the player is percived as medically dead (in seconds)
Config.RespawnTime = 300 -- How long before the player can respawn (in seconds)
Config.Crawl = false -- Enable to make the player crawl whilst in laststand
Config.PropDespawnTimer = 360*1000 -- How long before the ecg prop despawns after being placed in ms
Config.SavePlayerDataTimer = 60*1000 -- How often the player data should be saved in ms (the lower the more accurate the data is saved but the more performance impact) (The data is sent to the server so that the player data is saved when the player quits)
Config.AntiCombatLogLoop = 150 -- How often the anti combat log loop should run in ms (lower is better but has a higher performance impact)
Config.DeadBlipDelay = 360 -- How long the dead blip should be visible on the map in ms, with each tick of this reducing the transpaerncy of the blip 250 - 0
Config.AutomaticAmbulanceAlert = false -- Enable or disable the automatic ambulance alert when a player is downed
Config.inLastStandHealth = 200 -- MUST BE ABOVE ZERO 0, The health the player should have when they are in last stand
Config.DeathHealth = 200 -- MUST BE ABOVE ZERO 0, The health the player should have when they are dead
Config.XrayScreenTimeout = 10*1000 -- How long before the screen automatically shuts off after an xray

Config.BillCost = 2000 -- Price that players are charged for using the hospital check-in system
Config.WoundBills = true -- if this is true the checkin revive and respawn revive tooks wound calculator and set the price them
Config.WoundPrices = {
    ["abrasion"] = 200,
    ["avulsion"] = 100,
    ["contusion"] = 50,
    ["crush"] = 20,
    ["cut"] = 15,
    ["laceration"] = 30,
    ["lowvelocitywound"] = 80,
    ["mediumvelocitywound"] = 90,
    ["velocitywound"] = 100,
    ["puncturewound"] = 100,
    ["burn"] = 150,
    
    -- default price if wound missing in this list
    ["default"] = 50,
}

Config.MutePlayerOnLastStand = false
Config.MutePlayerOnDeath = true


-- Regen stuff
Config.BleedLossMultiplier = 1.0
Config.BleedingUpdate = 40000 -- How often should the bleeding update in ms? 15000 = 15 seconds
Config.BloodRegen = 0.0025 -- The amount of blood that regen every 10 seconds in liter (6 liters is max). (When in stable condition)
Config.HealthRegen = 1 -- The amount of health that regen every 10 seconds in healthpoints (200 is max). (When in good condition)
Config.HealthRegenUpdate = 10000

Config.MinimumBleedAmountBeforeHealthDegen = 0.005 -- The minimum amount of blood that must be activly lost before health starts to degenerate
Config.HealthBleedingDegen = 1 -- The amount of health that degens every bleedingupdate, in healthpoints. (When bleeding)
Config.HealthDegenUpdate = 3000 -- How often the health should degenerate when bleeding in ms

Config.KillPlayerInCriticalCondition = true -- Enable or disable to kill player when in critical condition (lower bpm than 30 and next to no bloodpressure)

-- The different types of equipment and their time to apply in ms
Config.QuickCheckVitalsTime = 3000 -- How long it should take to check pulse etc in ms
Config.ReviveKitTime = 5000
Config.BodybagTime = 5000

-- SIDE EFFECTS
Config.SideEffectsTime = 60000 -- The interval for how often the side effects should be triggered in ms

Config.ArmInjuryChance = 10 -- Chance, in percent, that an arm injury side-effect gets applied
Config.ArmInjuryTimer = 10 -- How much time, in seconds. (This disables firing weapons and stearing a vehicles left/right)

Config.CameraShakeIntensity = 0.1 -- How intense the camera shake should be when injured
Config.LegInjuryChance = { -- The chance, in percent, that leg injury side-effects get applied
    Running = 30,
    Walking = 10
}

Config.UseMovementRate = true -- Might contradict with other gym scripts? Set to false if so
Config.MovementRate = { -- Set the player movement rate based on the leg health
    0.95,
    0.85,
    0.80,
}

Config.BleedTime = 5000 -- The interval for how often the bleed effect (only visual) should be triggered in ms

-- SCREEN EFFECTS
Config.PainThreshold = 10 -- The pain threshold for when the screen should start to flash

Config.BlackoutEffect = true -- Blackouts caused by very high or low bp, not to be confused with head injuries that can cause short blackouts.
Config.HeadInjuryChance = 25 -- Chance, in percent, that a head injury side-effect gets applied (MINI BLACKOUTS)

Config.PainEffect = true
Config.BleedEffect = true

-- Wheelchair and Crutch
Config.MaxWheelChairTime = 60 -- The maximum time a player can be set in a wheelchair in minutes
Config.MaxCrutchTime = 60 -- The maximum time a player can be set in a wheelchair in minutes


Config.LockMedicalMenu = true -- Set to true if you want to lock the whole medical menu to only be opened by EMS

Config.ModularAccessLocks = { -- Configure what parts of the medicalmenu should be locked to ems only. All medications can be locked individually in Config.Medication
    ['cpr'] = true, -- Set to true to lock to ems only
    ['bodybag'] = true,
    ['revivekit'] = true, 
    ['transportation'] = false,
    ['cast'] = true,
    ['splint'] = true,
    ['quickChecks'] = false, -- Such as checking pulse, consciousness and body temperature
    ['castsaw'] = true, -- Removal of casts
}


Config.UseGarageSystem = false

-- ECG CONFIGURATION
Config.Prop = 'prop_ld_bomb'
Config.RenderDistance = 50 -- The rendering distance of an ECG, recommended to keep above 50 to avoid sync issues. 
Config.Alpha = 100 -- The prop transparency (51-300)
Config.AutoDeleteTime = 500 -- The time in seconds before the ECG is automatically deleted after being placed

-- Recommended to have all different keys (only needed if you _dont_ use target)
Config.PickupButton = 38
Config.AttachButton = 58
Config.DeleteButton = 52
Config.OptionsButton = 58
Config.InjectButton = 244
Config.CprButton = 182

-- Change that control to detach the stretcher
Config.ReleaseStretcher = 46 -- [E] 

Config.Bones = { -- Correspond bone hash numbers to their label
    [0]     = 'NONE',
    [31085] = 'HEAD',
    [31086] = 'HEAD',
    [39317] = 'NECK',
    [57597] = 'SPINE',
    [23553] = 'SPINE',
    [24816] = 'SPINE',
    [24817] = 'SPINE',
    [24818] = 'SPINE',
    [10706] = 'UPPER_BODY',
    [64729] = 'UPPER_BODY',
    [11816] = 'LOWER_BODY',
    [45509] = 'LARM',
    [61163] = 'LARM',
    [18905] = 'LHAND',
    [4089] = 'LFINGER',
    [4090] = 'LFINGER',
    [4137] = 'LFINGER',
    [4138] = 'LFINGER',
    [4153] = 'LFINGER',
    [4154] = 'LFINGER',
    [4169] = 'LFINGER',
    [4170] = 'LFINGER',
    [4185] = 'LFINGER',
    [4186] = 'LFINGER',
    [26610] = 'LFINGER',
    [26611] = 'LFINGER',
    [26612] = 'LFINGER',
    [26613] = 'LFINGER',
    [26614] = 'LFINGER',
    [58271] = 'LLEG',
    [63931] = 'LLEG',
    [2108] = 'LFOOT',
    [14201] = 'LFOOT',
    [40269] = 'RARM',
    [28252] = 'RARM',
    [57005] = 'RHAND',
    [58866] = 'RFINGER',
    [58867] = 'RFINGER',
    [58868] = 'RFINGER',
    [58869] = 'RFINGER',
    [58870] = 'RFINGER',
    [64016] = 'RFINGER',
    [64017] = 'RFINGER',
    [64064] = 'RFINGER',
    [64065] = 'RFINGER',
    [64080] = 'RFINGER',
    [64081] = 'RFINGER',
    [64096] = 'RFINGER',
    [64097] = 'RFINGER',
    [64112] = 'RFINGER',
    [64113] = 'RFINGER',
    [36864] = 'RLEG',
    [51826] = 'RLEG',
    [20781] = 'RFOOT',
    [52301] = 'RFOOT',
}

Config.BoneIndexes = { -- Correspond bone labels to their hash number
    ['NONE'] = 0,
    ['HEAD'] = 31086,
    ['NECK'] = 39317,
    ['SPINE'] = 24818,
    ['UPPER_BODY'] = 64729,
    ['LOWER_BODY'] = 11816,
    ['LARM'] = 61163,
    ['LHAND'] = 18905,
    ['LFINGER'] = 26614,
    ['LLEG'] = 63931,
    ['LFOOT'] = 14201,
    ['RARM'] = 28252,
    ['RHAND'] = 57005,
    ['RFINGER'] = 64113,
    ['RLEG'] = 51826,
    ['RFOOT'] = 52301,
}

Config.UseCustomProps = false -- If enabled, the script will apply the pedvariations from the config below (The default config is intended to be used with Sinner Mod Shop medical props pack)
Config.EnableCosmeticCasts = true -- Access casts and splints with additional menu buttons, intended for expanded roleplay options. These do not require fractures to be applied.
Config.Casts = {
    {
        type = 'splint',
        lang = lang.progress.applying_splint,
        removeLang = lang.progress.removing_splint,
        langUsed = lang.ui.splint_applied,
        langRemoved = lang.ui.splint_removed,
        buttonLang = lang.buttons.apply_splint,
        removeButtonLang = lang.buttons.remove_splint,
        anim = {
            name = 'gang_chatting_idle01',
            dict = 'anim@heists@narcotics@funding@gang_idle',
        },
        time = 5000,
        timeInCast = 15*60*1000,
        casts = {
            {
                itemName = 'neckbrace',
                removalItemName = '',
                bone = 'Head',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 8,
                    pedVariationId = 217,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'legsplint',
                removalItemName = '',
                bone = 'Rleg',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 10,
                    pedVariationId = 249,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'legsplint',
                removalItemName = '',
                bone = 'Lleg',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 7,
                    pedVariationId = 202,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'armsplint',
                removalItemName = '',
                bone = 'Rarm',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 7,
                    pedVariationId = 200,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'armsplint',
                removalItemName = '',
                bone = 'Larm',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 10,
                    pedVariationId = 248,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
        }
    },
    {
        type = 'cast',
        lang = lang.progress.applying_cast,
        removeLang = lang.progress.removing_cast,
        langUsed = lang.ui.cast_applied,
        langRemoved = lang.ui.cast_removed,
        buttonLang = lang.buttons.apply_cast,
        removeButtonLang = lang.buttons.remove_cast,
        anim = {
            name = 'gang_chatting_idle01',
            dict = 'anim@heists@narcotics@funding@gang_idle',
        },
        time = 5000,
        timeInCast = 15*60*1000,
        casts = {
            {
                itemName = 'neckcast',
                removalItemName = '', -- itemname, for example castsaw or ''
                bone = 'Head',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 10,
                    pedVariationId = 247,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'legcast',
                removalItemName = 'castsaw',
                bone = 'Rleg',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 7,
                    pedVariationId = 199,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'legcast',
                removalItemName = 'castsaw',
                bone = 'Lleg',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 7,
                    pedVariationId = 199,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'armcast',
                removalItemName = 'castsaw',
                bone = 'Rarm',
                -- animationName = 'brokenarm_clip',
                -- animationDict = 'brokenarm@export@anim',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 10,
                    pedVariationId = 245,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
            {
                itemName = 'armcast',
                removalItemName = 'castsaw',
                bone = 'Larm',
                animationName = nil,
                animationDict = nil,
                male = {
                    pedVariationCategory = 10,
                    pedVariationId = 245,
                },
                female = {
                    pedVariationCategory = 8,
                    pedVariationId = 209,
                },
            },
        }
    },

}