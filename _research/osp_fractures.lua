Config = Config or {}

Config.Fractures = {
    {
        bone = 'Head',
        chance = 15, -- Chance in % that a fracture is being applied when wounded
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        pain = 15.0
    }, 
    {
        bone = 'Larm',
        chance = 30,
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        pain = 15.0,
        lockSteering = true,
    },
    {
        bone = 'Rarm',
        chance = 30,
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        pain = 15.0,
        lockSteering = true,
    },
    {
        bone = 'Rleg',
        chance = 35,
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        pain = 15.0,
        causeStaggering = true, 
    },
    {
        bone = 'Lleg',
        chance = 35,
        causes = { 
            [Config.WeaponClasses['HEAVY_IMPACT']] = true,
            [Config.WeaponClasses['EXPLOSIVE']] = true,
            [Config.WeaponClasses['OTHER']] = true,
            [Config.WeaponClasses['SHOTGUN']] = true,
        },
        pain = 15.0,
        causeStaggering = true,
    },
}