Config = Config or {}

Config.DamageRigorousness = 5 -- Amount of hp on a hit before damages gets applied

Config.Wounds = { -- These are major/critical injuries
    ["abrasion"] = {
        name = "abrasion", -- schaafwonde
        causes = { 
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['WILDLIFE']] = true,
        },
        bleeding = 0,
        pain = 0.5,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = false,
    },

    ["avulsion"] = {
        name = "avulsion", -- afgescheurd weefsel
        causes = { 
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['WILDLIFE']] = true,
            [Config.WeaponClasses['CUTTING']] = true,
        },
        bleeding = 0.05, --0.06
        pain = 1.0,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = true,
    },

    ["contusion"] = {
        name = "contusion", -- kneuzing
        causes = { 
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['LIGHT_IMPACT']] = true,
        },
        bleeding = 0,
        pain = 1.0,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = false,
    },

    ["crush"] = { 
        name = "crush", -- kneuzing door verplettering
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
        },
        bleeding = 0.08, --0.06
        pain = 2.0,
        causeLimping = 1, -- Will only cause limping if the legs are damaged
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 50, -- 100 = 100% chance
        needSewing = false,
    },

    ["cut"] = {
        name = "cut", -- snijwonde
        causes = { 
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['CUTTING']] = true,
        },
        bleeding = 0.05, --0.04
        pain = 0.5,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = true,
    },

    ["laceration"] = {
        name = "laceration", -- scheurwonde
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['LIGHT_IMPACT']] = true,
        },
        bleeding = 0.05,
        pain = 2.0,
        reopeningTime = 160, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = true,
    },

    ["lowvelocitywound"] = {
        name = "lowvelocitywound", -- lage snelheid kogelwonde
        causes = { 
            [Config.WeaponClasses['SMALL_CALIBER']] = true,
        },
        bleeding = 0.1, --0.08
        pain = 3.0,
        causeLimping = 1, -- Will only cause limping if the legs are damaged
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 20, -- 100 = 100% chance
        needSewing = true,
    },

    ["mediumvelocitywound"] = {
        name = "mediumvelocitywound", -- medium snelheid kogelwonde
        causes = { 
            [Config.WeaponClasses['MEDIUM_CALIBER']] = true,
        },
        bleeding = 0.5, --0.20
        pain = 3.0,
        causeLimping = 1, -- Will only cause limping if the legs are damaged
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 20, -- 100 = 100% chance
        needSewing = true,
    },

    ["highvelocitywound"] = {
        name = "highvelocitywound",     -- hoge snelheid kogelwonde
        causes = { 
            [Config.WeaponClasses['HIGH_CALIBER']] = true,
        },
        bleeding = 0.7, --0.30
        pain = 3.0,
        causeLimping = 1,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 20, -- 100 = 100% chance
        needSewing = true,
    },

    ["velocitywound"] = {
        name = "velocitywound", -- kogelwonde
        causes = { 
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        bleeding = 0.3, --0.25
        pain = 3.0,
        causeLimping = 1, -- Will only cause limping if the legs are damaged
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 20, -- 100 = 100% chance
        needSewing = true,
    },

    ["puncturewound"] = {
        name = "puncturewound",  -- steekwonde
        causes = { 
            [Config.WeaponClasses['CUTTING']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
        },
        bleeding = 0.3, --0.20
        pain = 1.0,
        causeLimping = 1, -- Will only cause limping if the legs are damaged
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        causeStaggering = 50, -- 100 = 100% chance
        needSewing = true,
    },

    ["burn"] = {
        name = "burn", -- brandwonde
        causes = { 
            [Config.WeaponClasses['FIRE']] = true,
        },
        bleeding = 0,
        pain = 2.0,
        bodyTemp = 0.9,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = false,
    },
}

Config.MinorWounds = { -- These are minor wounds that might happen during soft collisions, falling over etc, the script will randomly pick one of the following wounds and apply them to the players body part
    ["abrasion"] = {
        name = "abrasion",
        bleeding = 0,
        pain = 1.0,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = false,
    },

    ["contusion"] = {
        name = "contusion",
        bleeding = 0,
        pain = 1.0,
        reopeningTime = 60, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
        needSewing = false,
    },

    -- ["laceration"] = {
    --     name = "laceration",
    --     bleeding = 0.2,
    --     pain = 2.2,
    --     reopeningTime = 160, -- base time in seconds before wound can reopen and then multiples by the bandage modifier
    --     needSewing = true,
    -- },
}